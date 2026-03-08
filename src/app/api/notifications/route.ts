import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getDataProvider } from "@/lib/data/provider";
import { connectToMongoDB } from "@/lib/mongodb/connection";
import {
  NotificationModel,
  PropertyModel,
  TenancyModel,
  UnitModel,
} from "@/lib/mongodb/models";
import { createNotification } from "@/lib/notifications";
import { createServerClient } from "@/lib/supabase/server";
import { getUser } from "@/services/user";

function toObjectId(value: string): Types.ObjectId | null {
  if (!Types.ObjectId.isValid(value)) return null;
  return new Types.ObjectId(value);
}

function calculateNextDueDate(
  startDate: Date | string,
  rentCycle: string | null,
): Date {
  const date = startDate instanceof Date ? new Date(startDate) : new Date(startDate);

  if (rentCycle === "monthly") {
    date.setMonth(date.getMonth() + 1);
  } else {
    date.setFullYear(date.getFullYear() + 1);
  }

  return date;
}

function mapMongoNotification(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  notification: any,
) {
  return {
    id: String(notification._id),
    title: notification.title,
    message: notification.message ?? null,
    type: notification.type,
    read: !!notification.read,
    created_at: notification.createdAt
      ? new Date(notification.createdAt).toISOString()
      : null,
    data:
      notification.data && typeof notification.data === "object"
        ? notification.data
        : null,
  };
}

function formatSchemaErrorMessage(message: string) {
  if (message.includes("schema cache") || message.includes("Could not find the table")) {
    return "Database tables are not initialized. Run the SQL in supabase/bootstrap.sql in your Supabase SQL editor.";
  }

  return message;
}

export async function GET(req: NextRequest) {
  const userData = await getUser();
  if (!userData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const unreadOnly = searchParams.get("unread") === "true";
  const provider = getDataProvider();

  if (provider === "mongo") {
    await connectToMongoDB();

    const mongoQuery = unreadOnly
      ? { userId: userData.id, read: false }
      : { userId: userData.id };

    const [notifications, unreadCount] = await Promise.all([
      NotificationModel.find(mongoQuery)
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      NotificationModel.countDocuments({
        userId: userData.id,
        read: false,
      }),
    ]);

    return NextResponse.json({
      notifications: notifications.map(mapMongoNotification),
      unreadCount,
    });
  }

  const supabase = await createServerClient();

  let query = supabase
    .from("notifications")
    .select("id, title, message, type, read, created_at, data")
    .eq("user_id", userData.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (unreadOnly) {
    query = query.eq("read", false);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: formatSchemaErrorMessage(error.message) },
      { status: 500 },
    );
  }

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userData.id)
    .eq("read", false);

  return NextResponse.json({
    notifications: data ?? [],
    unreadCount: count ?? 0,
  });
}

export async function PATCH(req: NextRequest) {
  const userData = await getUser();
  if (!userData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { notification_id, mark_all_read, action, tenancy_id } = body;
  const provider = getDataProvider();

  if (provider === "mongo") {
    await connectToMongoDB();

    if (mark_all_read) {
      await NotificationModel.updateMany(
        { userId: userData.id, read: false },
        { $set: { read: true } },
      );

      return NextResponse.json({ success: true });
    }

    if (notification_id) {
      if (action === "accept" || action === "reject") {
        if (!tenancy_id) {
          return NextResponse.json({ error: "Tenancy ID required" }, { status: 400 });
        }

        const tenancyObjectId = toObjectId(String(tenancy_id));
        if (!tenancyObjectId) {
          return NextResponse.json({ error: "Invalid tenancy ID" }, { status: 400 });
        }

        const newStatus = action === "accept" ? "active" : "rejected";

        if (action === "accept") {
          await TenancyModel.updateMany(
            {
              tenantId: userData.id,
              status: "active",
              _id: { $ne: tenancyObjectId },
            },
            { $set: { status: "terminated" } },
          );

          const pendingTenancy = await TenancyModel.findOne({
            _id: tenancyObjectId,
            tenantId: userData.id,
            status: "pending",
          })
            .select("startDate rentCycle")
            .lean();

          if (!pendingTenancy) {
            return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
          }

          const nextDueDate = calculateNextDueDate(
            pendingTenancy.startDate,
            pendingTenancy.rentCycle,
          );

          const updateResult = await TenancyModel.updateOne(
            {
              _id: tenancyObjectId,
              tenantId: userData.id,
              status: "pending",
            },
            {
              $set: {
                status: newStatus,
                nextDueDate,
              },
            },
          );

          if (updateResult.matchedCount === 0) {
            return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
          }
        } else {
          const updateResult = await TenancyModel.updateOne(
            {
              _id: tenancyObjectId,
              tenantId: userData.id,
              status: "pending",
            },
            { $set: { status: newStatus } },
          );

          if (updateResult.matchedCount === 0) {
            return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
          }
        }

        const tenancy = await TenancyModel.findById(tenancyObjectId)
          .select("unitId")
          .lean();

        if (tenancy) {
          const unit = await UnitModel.findById(tenancy.unitId)
            .select("name propertyId")
            .lean();

          if (unit) {
            const property = await PropertyModel.findById(unit.propertyId)
              .select("landlordId name")
              .lean();

            if (property?.landlordId) {
              await createNotification({
                userId: property.landlordId,
                title: action === "accept" ? "Tenancy Accepted" : "Tenancy Declined",
                message: `${userData.full_name || "A tenant"} has ${action === "accept" ? "accepted" : "declined"} the invitation to Unit ${unit.name} at ${property.name}.`,
                type: "system",
              });
            }
          }
        }
      }

      const notificationObjectId = toObjectId(String(notification_id));
      if (!notificationObjectId) {
        return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
      }

      await NotificationModel.updateOne(
        {
          _id: notificationObjectId,
          userId: userData.id,
        },
        { $set: { read: true } },
      );
    }

    return NextResponse.json({ success: true });
  }

  const supabase = await createServerClient();

  if (mark_all_read) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userData.id)
      .eq("read", false);

    if (error) {
      return NextResponse.json(
        { error: formatSchemaErrorMessage(error.message) },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true });
  }

  if (notification_id) {
    if (action === "accept" || action === "reject") {
      if (!tenancy_id) {
        return NextResponse.json({ error: "Tenancy ID required" }, { status: 400 });
      }

      const newStatus = action === "accept" ? "active" : "rejected";

      const { error: updateError } = await supabase
        .from("tenancies")
        .update({ status: newStatus })
        .eq("id", tenancy_id)
        .eq("tenant_id", userData.id);

      if (updateError) {
        return NextResponse.json(
          { error: formatSchemaErrorMessage(updateError.message) },
          { status: 500 },
        );
      }

      const { data: tenancy } = await supabase
        .from("tenancies")
        .select(`
          id,
          units!inner(
            properties!inner(landlord_id, name),
            name
          )
        `)
        .eq("id", tenancy_id)
        .single();

      if (tenancy) {
        const landlordId = tenancy.units.properties.landlord_id;
        const unitName = tenancy.units.name;
        const propertyName = tenancy.units.properties.name;

        await createNotification({
          userId: landlordId,
          title: action === "accept" ? "Tenancy Accepted" : "Tenancy Declined",
          message: `${userData.full_name || "A tenant"} has ${action === "accept" ? "accepted" : "declined"} the invitation to Unit ${unitName} at ${propertyName}.`,
          type: "system",
        });
      }
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notification_id)
      .eq("user_id", userData.id);

    if (error) {
      return NextResponse.json(
        { error: formatSchemaErrorMessage(error.message) },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ success: true });
}

// components/landing-nav-wrapper.tsx
import { getUser } from "@/services/user";
import { LandingNav } from "./landing-nav";

export async function LandingNavWrapper() {
  try {
    const user = await getUser();

    if (user) {
      return (
        <LandingNav
          initialUser={{
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
          }}
        />
      );
    }
  } catch (error) {
    console.error("Error fetching user in nav:", error);
  }

  // No user or error - pass null
  return <LandingNav initialUser={null} />;
}
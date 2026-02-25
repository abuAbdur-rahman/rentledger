import { redirect } from "next/navigation";

export default function HelpPage() {
  redirect("/coming-soon?feature=help");
}

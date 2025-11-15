import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server-client";
import BottomTabNavigation from "@/components/bottom-tab-navigation";
import Image from "next/image";

interface Props {
  children: ReactNode
}

export default async function Layout({ children }: Props) {
  const supabase = await createSupabaseServerComponentClient();

  // Use getUser() instead of getSession() for security
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select()
    .eq("auth_user_id", user?.id)
    .single();

  if (!profile) {
    return redirect("/sign-in");
  }

  // Check for wallets in database
  const { data: wallets } = await supabase
    .schema("public")
    .from("wallets")
    .select()
    .eq("profile_id", profile.id);

  return (
    <Tabs className="relative flex flex-col h-full px-5" defaultValue="balance">
      <div className="flex justify-center py-4">
        <Image 
          src="/heysalad-logo-black.png" 
          alt="HeySalad" 
          width={150} 
          height={40}
          priority
          className="object-contain"
        />
      </div>
      {children}
      <BottomTabNavigation />
    </Tabs>
  );
}

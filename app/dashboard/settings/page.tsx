import { redirect } from "next/navigation";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server-client";
import { PasskeySetup } from "@/components/passkey-setup";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/actions";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerComponentClient();

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

  // Check if user has passkey credentials in wallets table
  const { data: wallets } = await supabase
    .from("wallets")
    .select("passkey_credential")
    .eq("profile_id", profile.id)
    .not("passkey_credential", "is", null)
    .limit(1);

  const hasPasskey = wallets && wallets.length > 0 && wallets[0]?.passkey_credential;

  return (
    <div className="flex flex-col gap-4 pb-20">
      <h1 className="text-2xl font-bold text-black">Settings</h1>

      {/* Passkey Section */}
      <Card>
        <CardHeader>
          <CardTitle>Passkey Security</CardTitle>
          <CardDescription>
            {hasPasskey 
              ? "Your wallet is secured with a passkey" 
              : "Add a passkey to secure your wallet with biometric authentication"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasPasskey ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span className="font-medium">Passkey Active</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your wallet is protected with biometric authentication. You can update your passkey below.
              </p>
              <PasskeySetup username={user.email || user.id} isUpdate={true} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-yellow-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span className="font-medium">No Passkey Set</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Add a passkey to enable secure biometric authentication for your transactions.
              </p>
              <PasskeySetup username={user.email || user.id} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Section */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Phone Number</p>
            <p className="text-sm text-muted-foreground">{user.phone || "Not set"}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">User ID</p>
            <p className="text-sm text-muted-foreground font-mono text-xs">{user.id}</p>
          </div>
          <form action={signOutAction}>
            <Button variant="destructive" className="w-full">
              Sign Out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

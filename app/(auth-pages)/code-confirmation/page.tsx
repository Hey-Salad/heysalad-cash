"use client";

import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { GlobalContext } from "@/contexts/global-context";
import { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/utils/supabase/client";
import {
  toPasskeyTransport,
  toWebAuthnCredential,
  WebAuthnMode,
} from "@circle-fin/modular-wallets-core";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";

const clientKey = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY;
const clientUrl = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_URL;

// Create Circle transports
const passkeyTransport = toPasskeyTransport(clientUrl, clientKey);

export default function CodeConfirmation() {
  const supabase = createClient();
  const router = useRouter();
  const { phone } = useContext(GlobalContext);

  useEffect(() => {
    if (!phone) {
      console.warn("Phone number not specified, redirecting back to /sign-in");
      router.push("/sign-in");
    }
  }, [phone, router]);

  if (!phone) {
    return null;
  }

  const [loading, setLoading] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmationCodeInvalid = useMemo(
    () => confirmationCode.length !== 6,
    [confirmationCode],
  );

  const handleCodeValidation = async () => {
    if (isConfirmationCodeInvalid) {
      const warningMessage = "The confirmation code must have exactly 6 digits";
      console.warn(warningMessage);
      alert(warningMessage);
      return;
    }

    setLoading(true);

    const {
      data: { session },
      error,
    } = await supabase.auth.verifyOtp({
      phone,
      token: confirmationCode,
      type: "sms",
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    if (!session) {
      alert("Could not initialize session");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select()
      .eq("auth_user_id", session.user.id)
      .single();

    if (!profile) {
      router.push("/onboarding");
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="flex flex-col w-full flex-1 items-center justify-center px-5">
      <div className="flex flex-col min-w-64 w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Image 
            src="/heysalad-logo-black.png" 
            alt="HeySalad" 
            width={180} 
            height={50}
            priority
            className="object-contain"
          />
        </div>

        <h1 className="text-2xl font-bold mb-8 text-black text-center">
          Enter the code sent to
        </h1>

        <p className="text-lg text-black text-center mb-8">{phone}</p>

        <div className="flex flex-col gap-4">
          <div className="space-y-2 mx-auto">
            <InputOTP
              autoFocus
              maxLength={6}
              value={confirmationCode}
              onChange={setConfirmationCode}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="border-black text-black" />
                <InputOTPSlot index={1} className="border-black text-black" />
                <InputOTPSlot index={2} className="border-black text-black" />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} className="border-black text-black" />
                <InputOTPSlot index={4} className="border-black text-black" />
                <InputOTPSlot index={5} className="border-black text-black" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error && (
            <small className="text-sm text-red-600 font-medium leading-none text-center">
              {error}
            </small>
          )}

          <Button
            disabled={isConfirmationCodeInvalid || loading}
            className="w-full mt-4 bg-black hover:bg-black/90 text-white"
            onClick={handleCodeValidation}
          >
            {loading ? 'Verifying...' : 'Next'}
          </Button>

          <Button
            variant="ghost"
            onClick={() => router.push("/sign-in")}
            className="w-full text-black hover:text-black/90 hover:bg-transparent"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}

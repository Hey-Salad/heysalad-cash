"use client"

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/utils/supabase/client";
import { GlobalContext } from "@/contexts/global-context";
import { useRouter } from "next/navigation";
import { ChangeEventHandler, useContext, useMemo, useState } from "react";
import { InputMask, unformat } from "@react-input/mask";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Country = {
  code: string
  name: string
  flag: string
  mask: string
  minLength: number
  maxLength: number
  replacement: Record<string, RegExp>
}

const countries: Country[] = [
  { code: '+1', name: 'US', flag: '🇺🇸', mask: '(X__) X__-____', minLength: 10, maxLength: 10, replacement: { X: /[2-9]/, _: /\d/ } },
  { code: '+44', name: 'UK', flag: '🇬🇧', mask: '____ ___ ____', minLength: 10, maxLength: 10, replacement: { _: /\d/ } },
]

export default function SignIn() {
  const supabase = createClient()
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [unmaskedPhone, setUnmaskedPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState(countries[0])
  const { updateState } = useContext(GlobalContext)

  const prefixedPhone = useMemo(() => `${selectedCountry.code}${unmaskedPhone}`, [unmaskedPhone, selectedCountry])
  const isPhoneNumberInvalid = useMemo(() => {
    return unmaskedPhone.length < selectedCountry.minLength || unmaskedPhone.length > selectedCountry.maxLength
  }, [unmaskedPhone, selectedCountry])

  const handlePhoneChange: ChangeEventHandler<HTMLInputElement> = event => {
    setPhone(event.target.value)

    const unmaskedPhone = unformat(event.target.value, {
      mask: selectedCountry.mask,
      replacement: selectedCountry.replacement
    })

    setUnmaskedPhone(unmaskedPhone)
  }

  const handleCountryChange = (countryCode: string) => {
    const country = countries.find(c => c.code === countryCode)
    if (country) {
      setSelectedCountry(country)
      setPhone('')
      setUnmaskedPhone('')
    }
  }

  const signUpWithPhone = async () => {
    if (isPhoneNumberInvalid) {
      const warningMessage = selectedCountry.minLength === selectedCountry.maxLength 
        ? `The phone number must have exactly ${selectedCountry.minLength} digits`
        : `The phone number must have between ${selectedCountry.minLength} and ${selectedCountry.maxLength} digits`
      console.warn(warningMessage)
      alert(warningMessage)
      return
    }

    setLoading(true)

    console.log('Attempting to sign in with phone:', prefixedPhone)

    const { error: otpSignInError } = await supabase.auth.signInWithOtp({
      phone: prefixedPhone
    })

    if (otpSignInError) {
      console.error('OTP Sign In Error:', otpSignInError)
      alert(otpSignInError.message)
      setLoading(false)
      return
    }

    updateState({ phone: prefixedPhone })

    router.push('/code-confirmation')
  }

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
          Enter your phone number
        </h1>

        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Select value={selectedCountry.code} onValueChange={handleCountryChange}>
              <SelectTrigger className="w-[120px] text-black hover:text-black focus:text-black border-black focus:ring-black">
                <div className="flex items-center gap-2">
                  <span>{selectedCountry.flag}</span>
                  <span>{selectedCountry.code}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.code} className="text-black hover:text-black focus:text-black">
                    <span className="flex items-center gap-2">
                      <span>{country.flag}</span>
                      <span>{country.code}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <InputMask
              component={Input}
              mask={selectedCountry.mask}
              replacement={selectedCountry.replacement}
              placeholder="Phone number"
              value={phone}
              onChange={handlePhoneChange}
              className="flex-1 text-black placeholder:text-gray-400 border-black focus:ring-black focus-visible:ring-black"
            />
          </div>

          <Button
            disabled={isPhoneNumberInvalid || loading}
            className="w-full mt-4 bg-black hover:bg-black/90 text-white"
            onClick={signUpWithPhone}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
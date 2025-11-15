'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useWeb3 } from '@/components/web3-provider';

interface MoonPayButtonProps {
  className?: string;
}

export function MoonPayButton({ className }: MoonPayButtonProps) {
  const [loading, setLoading] = useState(false);
  const { accounts, activeChain } = useWeb3();

  const handleBuyClick = async () => {
    setLoading(true);

    try {
      const walletAddress = accounts[activeChain].address;
      
      if (!walletAddress) {
        alert('Please connect your wallet first');
        return;
      }

      // Get the currency code based on active chain
      const currencyCode = activeChain === 'polygon' ? 'usdc_polygon' : 'usdc_base';

      // Build MoonPay widget URL
      const moonpayUrl = new URL('https://buy.moonpay.com');
      moonpayUrl.searchParams.append('apiKey', process.env.NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY!);
      moonpayUrl.searchParams.append('currencyCode', currencyCode);
      moonpayUrl.searchParams.append('walletAddress', walletAddress);
      moonpayUrl.searchParams.append('colorCode', '#000000'); // Black theme
      moonpayUrl.searchParams.append('showWalletAddressForm', 'false');
      moonpayUrl.searchParams.append('enabledPaymentMethods', 'credit_debit_card,apple_pay,google_pay,sepa_bank_transfer,gbp_bank_transfer');

      // Open MoonPay in a new window
      const width = 500;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      window.open(
        moonpayUrl.toString(),
        'MoonPay',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
    } catch (error) {
      console.error('Error opening MoonPay:', error);
      alert('Failed to open MoonPay. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleBuyClick}
      disabled={loading || !accounts[activeChain].address}
      className={className}
    >
      {loading ? 'Opening...' : 'Buy USDC'}
    </Button>
  );
}

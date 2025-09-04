/**
 * Calculate payment fees based on payment method and order amount
 * @param paymentMethod - 'cash', 'card', or 'tabby'
 * @param orderAmount - The total order amount
 * @returns The calculated payment fees
 */
export function calculatePaymentFees(paymentMethod: string, orderAmount: number): number {
  switch (paymentMethod.toLowerCase()) {
    case 'cash':
      return 0;
    
    case 'tabby':
      // 6.99% of paid amount + 1.5 AED fixed + 6 AED transfer + 0.5% VAT
      const tabbyPercentage = orderAmount * 0.0699;
      const tabbyFixed = 1.5;
      const tabbyTransfer = 0;
      const tabbyVAT = (tabbyPercentage + tabbyFixed + tabbyTransfer) * 0.05;
      return tabbyPercentage + tabbyFixed + tabbyTransfer + tabbyVAT;
    
    case 'card':
      // 2.9% of paid amount + 1 AED fixed + 0.5% VAT
      const cardPercentage = orderAmount * 0.029;
      const cardFixed = 1;
      const cardVAT = (cardPercentage + cardFixed) * 0.05;
      return cardPercentage + cardFixed + cardVAT;
    
    default:
      return 0;
  }
}

/**
 * Get payment fees breakdown for display
 * @param paymentMethod - 'cash', 'card', or 'tabby'
 * @param orderAmount - The total order amount
 * @returns Object with fee breakdown
 */
export function getPaymentFeesBreakdown(paymentMethod: string, orderAmount: number) {
  switch (paymentMethod.toLowerCase()) {
    case 'cash':
      return {
        total: 0,
        breakdown: 'No fees for cash payments'
      };
    
    case 'tabby':
      const tabbyPercentage = orderAmount * 0.0699;
      const tabbyFixed = 1.5;
      const tabbyTransfer = 0;
      const tabbyVAT = (tabbyPercentage + tabbyFixed + tabbyTransfer) * 0.05;
      const tabbyTotal = tabbyPercentage + tabbyFixed + tabbyTransfer + tabbyVAT;
      return {
        total: tabbyTotal,
        breakdown: `6.99% (${tabbyPercentage.toFixed(2)}) + 1.5 AED fixed + 6 AED transfer + 0.5% VAT (${tabbyVAT.toFixed(2)})`
      };
    
    case 'card':
      const cardPercentage = orderAmount * 0.029;
      const cardFixed = 1;
      const cardVAT = (cardPercentage + cardFixed) * 0.05;
      const cardTotal = cardPercentage + cardFixed + cardVAT;
      return {
        total: cardTotal,
        breakdown: `2.9% (${cardPercentage.toFixed(2)}) + 1 AED fixed + 0.5% VAT (${cardVAT.toFixed(2)})`
      };
    
    default:
      return {
        total: 0,
        breakdown: 'Unknown payment method'
      };
  }
}

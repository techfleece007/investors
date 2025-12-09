interface OrderItem {
  product_name: string
  size: string
  quantity: number
  unit_price: number
  total_price: number
}

interface OrderEmailDetails {
  order_number: number
  shipping_number: number
  status: string
  items: OrderItem[]
  payment_method: string
  payment_fees: number
  delivery_fees: number
  created_at: string
}

export async function sendOrderEmail(orderDetails: OrderEmailDetails) {
  // Note: Email sending is controlled by the API route based on NODE_ENV
  // In development mode, emails will be skipped automatically
  try {
    const response = await fetch('/api/send-order-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderDetails)
    })

    const result = await response.json()
    
    // Handle skipped emails gracefully
    if (result.skipped) {
      console.log('📧 Email skipped (dev mode): Order email would be sent for order #' + orderDetails.order_number)
      return { success: true, messageId: result.messageId, skipped: true }
    }
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email')
    }

    console.log('Order email sent successfully:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending order email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

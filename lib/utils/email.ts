interface OrderDetails {
  order_number: number
  status: string
  product_name: string
  sizes: string
  quantity: number
  total_price: number
  payment_method: string
  payment_fees: number
  delivery_fees: number
  created_at: string
}

export async function sendOrderNotification(orderDetails: OrderDetails) {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderDetails)
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email')
    }

    console.log('Email sent successfully:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

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
  try {
    const response = await fetch('/api/send-order-email', {
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

    console.log('Order email sent successfully:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending order email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

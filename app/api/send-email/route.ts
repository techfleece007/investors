import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

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

export async function POST(request: NextRequest) {
  try {
    const orderDetails: OrderDetails = await request.json()

    // Validate environment variables
    if (!process.env.EMAIL_PASSWORD) {
      console.error('EMAIL_PASSWORD environment variable is not set')
      return NextResponse.json({ success: false, error: 'Email configuration missing' }, { status: 500 })
    }

    // Create transporter using Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'prvyit@gmail.com',
        pass: process.env.EMAIL_PASSWORD
      },
      // Add production-ready configuration
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 20000,
      rateLimit: 5
    })

    // Format the order details for email
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'AED'
      }).format(amount)
    }

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const emailSubject = `New Order ${orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1)}`
    
    // Get production domain from environment or use default
    const productionDomain = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
    
    const emailBody = `
Order Details:
================

Order Number: #${orderDetails.order_number}
Status: ${orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1)}
Date: ${formatDate(orderDetails.created_at)}

Product Information:
- Product: ${orderDetails.product_name}
- Size: ${orderDetails.sizes}
- Quantity: ${orderDetails.quantity}
- Price per piece: ${formatCurrency(orderDetails.total_price / orderDetails.quantity)}

Financial Details:
- Total Price: ${formatCurrency(orderDetails.total_price)}
- Payment Method: ${orderDetails.payment_method}
- Payment Fees: ${formatCurrency(orderDetails.payment_fees)}
- Delivery Fees: ${formatCurrency(orderDetails.delivery_fees)}
- Grand Total: ${formatCurrency(orderDetails.total_price + orderDetails.payment_fees + orderDetails.delivery_fees)}

---
This is an automated notification from the Trading Dashboard.
Dashboard: ${productionDomain}
    `.trim()

    // Send email
    const info = await transporter.sendMail({
      from: 'prvyit@gmail.com',
      to: 'qudaih.tamer@gmail.com',
      subject: emailSubject,
      text: emailBody
    })

    console.log('Email sent successfully:', info.messageId)
    return NextResponse.json({ success: true, messageId: info.messageId })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

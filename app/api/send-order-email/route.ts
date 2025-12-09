import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

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

export async function POST(request: NextRequest) {
  try {
    // Only send emails in production mode
    const isProduction = process.env.NODE_ENV === 'production' || process.env.ENABLE_EMAILS === 'true'
    
    if (!isProduction) {
      const orderDetails: OrderEmailDetails = await request.json()
      console.log('📧 Email skipped (dev mode): Order email would be sent for order #' + orderDetails.order_number)
      return NextResponse.json({ 
        success: true, 
        messageId: 'skipped-dev-mode',
        skipped: true,
        message: 'Email skipped in development mode' 
      })
    }

    const orderDetails: OrderEmailDetails = await request.json()

    if (!process.env.EMAIL_PASSWORD) {
      console.error('EMAIL_PASSWORD environment variable is not set')
      return NextResponse.json({ success: false, error: 'Email configuration missing' }, { status: 500 })
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'prvyit@gmail.com',
        pass: process.env.EMAIL_PASSWORD,
      },
    })

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(amount)

    const formatDate = (dateString: string) =>
      new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

    const statusEmoji: Record<string, string> = {
      completed: '✅',
      pending: '⏳',
      cancelled: '❌',
      canceled: '❌',
      shipped: '🚚',
      delivered: '📦',
    }

    const totalProducts = orderDetails.items.length
    const totalQuantity = orderDetails.items.reduce((sum, item) => sum + item.quantity, 0)
    const subtotal = orderDetails.items.reduce((sum, item) => sum + item.total_price, 0)

    const emailSubject = `Order ${orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1)} - #${
      orderDetails.order_number
    }`

    const productionDomain = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'

    const htmlEmailBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${emailSubject}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:20px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
              
              <!-- Header -->
              <tr>
                <td align="center" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;color:#fff;">
                  <h1 style="margin:0;font-size:24px;font-weight:bold;">
                    ${statusEmoji[orderDetails.status.toLowerCase()] || '📦'} 
                    Order ${orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1)}
                  </h1>
                  <p style="margin:8px 0 0;font-size:16px;">Order #${orderDetails.order_number}</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding:30px;">

                  <!-- Order Info -->
                  <h2 style="margin:0 0 15px;font-size:18px;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">Order Information</h2>
                  <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
                    <tr><td style="font-weight:bold;width:40%;">Order Number</td><td>#${orderDetails.order_number}</td></tr>
                    <tr><td style="font-weight:bold;">Shipping Number</td><td>#${orderDetails.shipping_number}</td></tr>
                    <tr><td style="font-weight:bold;">Status</td><td>${orderDetails.status}</td></tr>
                    <tr><td style="font-weight:bold;">Date</td><td>${formatDate(orderDetails.created_at)}</td></tr>
                    <tr><td style="font-weight:bold;">Payment Method</td><td>${orderDetails.payment_method}</td></tr>
                  </table>

                  <!-- Product Details -->
                  <h2 style="margin:0 0 15px;font-size:18px;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">Product Details</h2>
                  <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
                    <thead>
                      <tr style="background:#f7fafc;">
                        <th align="left" style="border-bottom:2px solid #e2e8f0;">Product</th>
                        <th align="left" style="border-bottom:2px solid #e2e8f0;">Size</th>
                        <th align="left" style="border-bottom:2px solid #e2e8f0;">Qty</th>
                        <th align="left" style="border-bottom:2px solid #e2e8f0;">Unit Price</th>
                        <th align="left" style="border-bottom:2px solid #e2e8f0;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${orderDetails.items
                        .map(
                          (item) => `
                        <tr>
                          <td>${item.product_name}</td>
                          <td>${item.size}</td>
                          <td>${item.quantity}</td>
                          <td>${formatCurrency(item.unit_price)}</td>
                          <td>${formatCurrency(item.total_price)}</td>
                        </tr>`
                        )
                        .join('')}
                    </tbody>
                  </table>

                  <!-- Summary -->
                  <h2 style="margin:0 0 15px;font-size:18px;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">Order Summary</h2>
                  <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
                    <tr><td>Total Products:</td><td align="right">${totalProducts}</td></tr>
                    <tr><td>Total Quantity:</td><td align="right">${totalQuantity}</td></tr>
                    <tr><td>Subtotal:</td><td align="right">${formatCurrency(subtotal)}</td></tr>
                    <tr><td>Payment Fees:</td><td align="right">${formatCurrency(orderDetails.payment_fees)}</td></tr>
                    <tr><td>Delivery Fees:</td><td align="right">${formatCurrency(orderDetails.delivery_fees)}</td></tr>
                    <tr style="font-weight:bold;font-size:16px;border-top:2px solid #e2e8f0;">
                      <td>Total Order Value:</td><td align="right">${formatCurrency(subtotal)}</td>
                    </tr>
                  </table>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td align="center" style="background:#f8fafc;padding:20px;color:#718096;font-size:14px;">
                  <p style="margin:0;">This is an automated notification from the Trading Dashboard.</p>
                  <p style="margin:5px 0 0;"><a href="${productionDomain}" style="color:#667eea;text-decoration:none;">Access your dashboard</a></p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `.trim()

    const info = await transporter.sendMail({
      from: 'prvyit@gmail.com',
      to: 'qudaih.tamer@gmail.com',
      subject: emailSubject,
      html: htmlEmailBody,
    })

    console.log('Email sent successfully:', info.messageId)
    return NextResponse.json({ success: true, messageId: info.messageId })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

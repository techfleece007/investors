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
    const orderDetails: OrderEmailDetails = await request.json()

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

    const statusEmoji = {
      'completed': '✅',
      'pending': '⏳',
      'cancelled': '❌',
      'canceled': '❌',
      'shipped': '🚚',
      'delivered': '📦'
    }

    const statusColor = {
      'completed': '#10B981',
      'pending': '#F59E0B',
      'cancelled': '#EF4444',
      'canceled': '#EF4444',
      'shipped': '#3B82F6',
      'delivered': '#10B981'
    }

    const totalProducts = orderDetails.items.length
    const totalQuantity = orderDetails.items.reduce((sum, item) => sum + item.quantity, 0)
    const subtotal = orderDetails.items.reduce((sum, item) => sum + item.total_price, 0)
    const grandTotal = subtotal + orderDetails.payment_fees + orderDetails.delivery_fees

    const emailSubject = `Order ${orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1)} - #${orderDetails.order_number}`
    
    // Get production domain from environment or use default
    const productionDomain = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
    
    const htmlEmailBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order ${orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1)}</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f8fafc;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 700;
            }
            .header .order-number {
                font-size: 18px;
                margin-top: 8px;
                opacity: 0.9;
            }
            .content {
                padding: 30px;
            }
            .status-badge {
                display: inline-block;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: 600;
                font-size: 14px;
                margin-bottom: 20px;
            }
            .section {
                margin-bottom: 25px;
            }
            .section-title {
                font-size: 18px;
                font-weight: 600;
                color: #2d3748;
                margin-bottom: 15px;
                padding-bottom: 8px;
                border-bottom: 2px solid #e2e8f0;
            }
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 20px;
            }
            .info-item {
                display: flex;
                flex-direction: column;
            }
            .info-label {
                font-size: 12px;
                color: #718096;
                text-transform: uppercase;
                font-weight: 600;
                margin-bottom: 4px;
            }
            .info-value {
                font-size: 16px;
                color: #2d3748;
                font-weight: 500;
            }
            .product-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }
            .product-table th {
                background-color: #f7fafc;
                color: #4a5568;
                font-weight: 600;
                padding: 12px;
                text-align: left;
                border-bottom: 2px solid #e2e8f0;
            }
            .product-table td {
                padding: 12px;
                border-bottom: 1px solid #e2e8f0;
            }
            .product-table tr:nth-child(even) {
                background-color: #f8fafc;
            }
            .summary-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-top: 20px;
            }
            .summary-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #e2e8f0;
            }
            .summary-item.total {
                font-weight: 700;
                font-size: 18px;
                color: #2d3748;
                border-top: 2px solid #e2e8f0;
                border-bottom: none;
                padding-top: 12px;
                margin-top: 8px;
            }
            .footer {
                background-color: #f8fafc;
                padding: 20px 30px;
                text-align: center;
                color: #718096;
                font-size: 14px;
            }
            .footer a {
                color: #667eea;
                text-decoration: none;
            }
            @media (max-width: 600px) {
                .info-grid, .summary-grid {
                    grid-template-columns: 1fr;
                }
                .container {
                    margin: 10px;
                }
                .content {
                    padding: 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${statusEmoji[orderDetails.status as keyof typeof statusEmoji] || '📦'} Order ${orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1)}</h1>
                <div class="order-number">Order #${orderDetails.order_number}</div>
            </div>
            
            <div class="content">
                <div class="status-badge" style="background-color: ${statusColor[orderDetails.status as keyof typeof statusColor] || '#6B7280'}; color: white;">
                    ${orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1)}
                </div>

                <div class="section">
                    <div class="section-title">Order Information</div>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Order Number</div>
                            <div class="info-value">#${orderDetails.order_number}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Shipping Number</div>
                            <div class="info-value">#${orderDetails.shipping_number}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Status</div>
                            <div class="info-value">${orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Date</div>
                            <div class="info-value">${formatDate(orderDetails.created_at)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Payment Method</div>
                            <div class="info-value">${orderDetails.payment_method}</div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Product Details</div>
                    <table class="product-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Size</th>
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orderDetails.items.map(item => `
                                <tr>
                                    <td>${item.product_name}</td>
                                    <td>${item.size}</td>
                                    <td>${item.quantity}</td>
                                    <td>${formatCurrency(item.unit_price)}</td>
                                    <td>${formatCurrency(item.total_price)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <div class="section-title">Order Summary</div>
                    <div class="summary-grid">
                        <div>
                            <div class="summary-item">
                                <span>Total Products:</span>
                                <span>${totalProducts}</span>
                            </div>
                            <div class="summary-item">
                                <span>Total Quantity:</span>
                                <span>${totalQuantity}</span>
                            </div>
                            <div class="summary-item">
                                <span>Subtotal:</span>
                                <span>${formatCurrency(subtotal)}</span>
                            </div>
                        </div>
                        <div>
                            <div class="summary-item">
                                <span>Payment Fees:</span>
                                <span>${formatCurrency(orderDetails.payment_fees)}</span>
                            </div>
                            <div class="summary-item">
                                <span>Delivery Fees:</span>
                                <span>${formatCurrency(orderDetails.delivery_fees)}</span>
                            </div>
                            <div class="summary-item total">
                                <span>Total Order Value:</span>
                                <span>${formatCurrency(grandTotal)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="footer">
                <p>This is an automated notification from the Trading Dashboard.</p>
                <p><a href="${productionDomain}">Access your dashboard</a></p>
            </div>
        </div>
    </body>
    </html>
    `.trim()

    // Send email
    const info = await transporter.sendMail({
      from: 'prvyit@gmail.com',
      to: 'qudaih.tamer@gmail.com',
      subject: emailSubject,
      html: htmlEmailBody
    })

    console.log('Email sent successfully:', info.messageId)
    return NextResponse.json({ success: true, messageId: info.messageId })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

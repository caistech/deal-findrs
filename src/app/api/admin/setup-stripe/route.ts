import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/client'
import { requireAdmin } from '@/lib/auth/require-admin'

const PRODUCTS = [
  {
    name: 'DealFindrs Free Trial',
    description: '14-day free trial with limited features',
    metadata: {
      tier: 'free',
      opportunities_limit: '5',
      users_limit: '1',
    },
    prices: [
      {
        nickname: 'Free Trial',
        unit_amount: 0,
        currency: 'aud',
        recurring: { interval: 'month' as const },
        metadata: { tier: 'free', billing: 'monthly' },
      },
    ],
  },
  {
    name: 'DealFindrs Standard',
    description: 'For growing property developers - 50 opportunities/month, 5 users',
    metadata: {
      tier: 'standard',
      opportunities_limit: '50',
      users_limit: '5',
    },
    prices: [
      {
        nickname: 'Standard Monthly',
        unit_amount: 9900, // $99.00
        currency: 'aud',
        recurring: { interval: 'month' as const },
        metadata: { tier: 'standard', billing: 'monthly' },
      },
      {
        nickname: 'Standard Yearly',
        unit_amount: 99000, // $990.00 (2 months free)
        currency: 'aud',
        recurring: { interval: 'year' as const },
        metadata: { tier: 'standard', billing: 'yearly' },
      },
    ],
  },
  {
    name: 'DealFindrs Premium',
    description: 'For established companies - Unlimited opportunities and users',
    metadata: {
      tier: 'premium',
      opportunities_limit: 'unlimited',
      users_limit: 'unlimited',
    },
    prices: [
      {
        nickname: 'Premium Monthly',
        unit_amount: 29900, // $299.00
        currency: 'aud',
        recurring: { interval: 'month' as const },
        metadata: { tier: 'premium', billing: 'monthly' },
      },
      {
        nickname: 'Premium Yearly',
        unit_amount: 299000, // $2990.00 (2 months free)
        currency: 'aud',
        recurring: { interval: 'year' as const },
        metadata: { tier: 'premium', billing: 'yearly' },
      },
    ],
  },
]

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin.error) {
    return NextResponse.json(
      { error: admin.error },
      { status: admin.error === 'forbidden' ? 403 : 401 }
    )
  }
  try {
    const stripe = getStripe()

    // List existing products
    const products = await stripe.products.list({ limit: 100, active: true })
    const prices = await stripe.prices.list({ limit: 100, active: true })
    
    const dealFindrsProducts = products.data.filter(p => p.name.startsWith('DealFindrs'))
    
    return NextResponse.json({
      configured: dealFindrsProducts.length > 0,
      products: dealFindrsProducts.map(p => ({
        id: p.id,
        name: p.name,
        tier: p.metadata?.tier,
      })),
      prices: prices.data
        .filter(p => dealFindrsProducts.some(prod => prod.id === p.product))
        .map(p => ({
          id: p.id,
          nickname: p.nickname,
          amount: p.unit_amount,
          interval: p.recurring?.interval,
          tier: p.metadata?.tier,
          billing: p.metadata?.billing,
        })),
    })
  } catch (error: any) {
    if (error.message?.includes('API key')) {
      return NextResponse.json({ configured: false, error: 'STRIPE_SECRET_KEY not set' })
    }
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin.error) {
    return NextResponse.json(
      { error: admin.error },
      { status: admin.error === 'forbidden' ? 403 : 401 }
    )
  }
  try {
    const { action } = await request.json()
    const stripe = getStripe()

    if (action === 'create') {
      const results: Record<string, any> = { products: {}, prices: {} }

      for (const productConfig of PRODUCTS) {
        // Check if product exists
        const existing = await stripe.products.list({ limit: 100 })
        let product = existing.data.find(p => p.name === productConfig.name)

        if (!product) {
          product = await stripe.products.create({
            name: productConfig.name,
            description: productConfig.description,
            metadata: productConfig.metadata,
          })
        }

        results.products[productConfig.metadata.tier] = product.id

        // Create prices
        for (const priceConfig of productConfig.prices) {
          const price = await stripe.prices.create({
            product: product.id,
            nickname: priceConfig.nickname,
            unit_amount: priceConfig.unit_amount,
            currency: priceConfig.currency,
            recurring: priceConfig.recurring,
            metadata: priceConfig.metadata,
          })

          const key = `${priceConfig.metadata.tier}_${priceConfig.metadata.billing}`
          results.prices[key] = price.id
        }
      }

      // Generate env vars
      const env = {
        STRIPE_PRICE_FREE_MONTHLY: results.prices.free_monthly || '',
        STRIPE_PRICE_STANDARD_MONTHLY: results.prices.standard_monthly || '',
        STRIPE_PRICE_STANDARD_YEARLY: results.prices.standard_yearly || '',
        STRIPE_PRICE_PREMIUM_MONTHLY: results.prices.premium_monthly || '',
        STRIPE_PRICE_PREMIUM_YEARLY: results.prices.premium_yearly || '',
      }

      return NextResponse.json({ success: true, results, env })
    }

    if (action === 'delete') {
      // Archive all DealFindrs products (can't delete, only archive)
      const products = await stripe.products.list({ limit: 100 })
      const dealFindrsProducts = products.data.filter(p => p.name.startsWith('DealFindrs'))

      for (const product of dealFindrsProducts) {
        // First archive all prices
        const prices = await stripe.prices.list({ product: product.id })
        for (const price of prices.data) {
          await stripe.prices.update(price.id, { active: false })
        }
        // Then archive product
        await stripe.products.update(product.id, { active: false })
      }

      return NextResponse.json({ success: true, archived: dealFindrsProducts.length })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Stripe setup error:', error)
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 })
  }
}

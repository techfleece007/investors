'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, Package, X, CheckCircle } from 'lucide-react'
import Image from 'next/image'

interface Product {
  id: string
  name: string
  cost_per_piece: number
  price_per_piece: number
  quantity: number
  image_url: string
  variants: ProductVariant[]
}

interface ProductVariant {
  id?: string
  size: string
  quantity: number
  price: number
  cost: number
}

// Size order for sorting
const SIZE_ORDER = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']

const sortBySize = (variants: ProductVariant[]) => {
  return [...variants].sort((a, b) => {
    const indexA = SIZE_ORDER.indexOf(a.size.toUpperCase())
    const indexB = SIZE_ORDER.indexOf(b.size.toUpperCase())
    // If size not found in order, put it at the end
    const orderA = indexA === -1 ? SIZE_ORDER.length : indexA
    const orderB = indexB === -1 ? SIZE_ORDER.length : indexB
    return orderA - orderB
  })
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    cost_per_piece: 0,
    price_per_piece: 0,
    quantity: 0,
    image_url: '',
    variants: [{ size: '', quantity: 0, price: 0, cost: 0 }]
  })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name')

      if (productsError) throw productsError

      const { data: variantsData, error: variantsError } = await supabase
        .from('product_variants')
        .select('*')

      if (variantsError) throw variantsError

      // Group variants by product
      const productsWithVariants = productsData.map(product => ({
        ...product,
        variants: variantsData.filter(variant => variant.product_id === product.id)
      }))

      setProducts(productsWithVariants)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingProduct) {
        // Update existing product
        const { error: productError } = await supabase
          .from('products')
          .update({
            name: formData.name,
            cost_per_piece: formData.cost_per_piece,
            price_per_piece: formData.price_per_piece,
            quantity: formData.quantity,
            image_url: formData.image_url
          })
          .eq('id', editingProduct.id)

        if (productError) throw productError

        // Update variants
        for (const variant of formData.variants) {
          if ((variant as any).id) {
            await supabase
              .from('product_variants')
              .update({
                size: variant.size,
                quantity: variant.quantity,
                price: variant.price,
                cost: variant.cost
              })
              .eq('id', (variant as any).id)
          } else {
            await supabase
              .from('product_variants')
              .insert({
                product_id: editingProduct.id,
                size: variant.size,
                quantity: variant.quantity,
                price: variant.price,
                cost: variant.cost
              })
          }
        }
      } else {
        // Create new product
        const { data: product, error: productError } = await supabase
          .from('products')
          .insert({
            name: formData.name,
            cost_per_piece: formData.cost_per_piece,
            price_per_piece: formData.price_per_piece,
            quantity: formData.quantity,
            image_url: formData.image_url
          })
          .select()
          .single()

        if (productError) throw productError

        // Create variants
        for (const variant of formData.variants) {
          await supabase
            .from('product_variants')
            .insert({
              product_id: product.id,
              size: variant.size,
              quantity: variant.quantity,
              price: variant.price,
              cost: variant.cost
            });
        }
      }

      setShowSuccess(true)
      setSuccessMessage(editingProduct ? 'Product updated successfully!' : 'Product created successfully!')
      setShowAddModal(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
      
      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving product:', error);
    }
  }

  const handleDelete = async (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await supabase.from('product_variants').delete().eq('product_id', productId);
        await supabase.from('products').delete().eq('id', productId);
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      cost_per_piece: 0,
      price_per_piece: 0,
      quantity: 0,
      image_url: '',
      variants: [{ size: '', quantity: 0, price: 0, cost: 0 }]
    });
    setImagePreview(null);
  };

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, { size: '', quantity: 0, price: 0, cost: 0 }]
    }));
  };

  const removeVariant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }));
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant
      )
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setFormData(prev => ({ ...prev, image_url: result.filename }))
        // Use the cache-busted URL for immediate visibility
        setImagePreview(result.imageUrl || URL.createObjectURL(file))
      } else {
        alert(result.error || 'Failed to upload image')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground">Manage your product inventory</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in slide-in-from-right-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="aspect-square relative bg-muted">
              {product.image_url ? (
                <Image
                  src={
                    product.image_url.startsWith('http://') || product.image_url.startsWith('https://')
                      ? product.image_url
                      : product.image_url.startsWith('/')
                      ? product.image_url
                      : `/images/${product.image_url}`
                  }
                  alt={product.name}
                  fill
                  className="object-cover"
                  unoptimized={true}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Package className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">{product.name}</h3>

              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cost per piece:</span>
                  <span className="text-foreground">AED {product.cost_per_piece}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price per piece:</span>
                  <span className="text-foreground">AED {product.price_per_piece}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total quantity:</span>
                  <span className="text-foreground">{product.quantity}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Variants:</p>
                  {sortBySize(product.variants).map((variant) => (
                    <div key={variant.id} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Size {variant.size}:</span>
                      <span className="text-foreground">
                        Qty: {variant.quantity} | AED {variant.price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingProduct(product)
                    setFormData({
                      name: product.name,
                      cost_per_piece: product.cost_per_piece,
                      price_per_piece: product.price_per_piece,
                      quantity: product.quantity,
                      image_url: product.image_url,
                      variants: product.variants.map(v => ({ ...v }))
                    })
                    setImagePreview(null) // Reset preview for editing
                    setShowAddModal(true)
                  }}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="inline-flex items-center justify-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowAddModal(false)
            setEditingProduct(null)
            resetForm()
          }}
        >
          <div 
            className="bg-card border border-border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingProduct(null)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                    required
                  />
                </div>



                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Cost per Piece (AED)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cost_per_piece}
                      onChange={(e) => setFormData(prev => ({ ...prev, cost_per_piece: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Price per Piece (AED)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price_per_piece}
                      onChange={(e) => setFormData(prev => ({ ...prev, price_per_piece: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:ring-2 focus:ring-blue-500 text-foreground"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Total Quantity
                    </label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Product Image
                  </label>
                  
                  {/* Image Upload Section */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Upload New Image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {uploadingImage && (
                        <p className="text-xs text-blue-600 mt-1">Uploading image...</p>
                      )}
                    </div>

                    <div className="text-center text-sm text-muted-foreground">OR</div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Use Existing Image (Filename)
                      </label>
                      <input
                        type="text"
                        value={formData.image_url}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, image_url: e.target.value }))
                          setImagePreview(null) // Clear preview when manually typing
                        }}
                        className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                        placeholder="e.g., nike-new-black.jpg"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter image filename (e.g., nike-new-black.jpg), path (e.g., /images/filename.jpg), or external URL (e.g., https://example.com/image.jpg)
                      </p>
                      {formData.image_url && (
                        <button
                          type="button"
                          onClick={() => setImagePreview(null)} // This will trigger the preview to show
                          className="mt-2 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          Preview Image
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Image Preview */}
                  {(imagePreview || formData.image_url) && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Preview
                      </label>
                      <div className="w-32 h-32 border border-border rounded-md overflow-hidden bg-muted">
                        <Image
                          src={
                            imagePreview || 
                            (formData.image_url.startsWith('http://') || formData.image_url.startsWith('https://')
                              ? formData.image_url
                              : formData.image_url.startsWith('/')
                              ? formData.image_url
                              : `/images/${formData.image_url}`)
                          }
                          alt="Product preview"
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                          unoptimized={true}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-foreground">
                      Variants
                    </label>
                    <button
                      type="button"
                      onClick={addVariant}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add Variant
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.variants.map((variant, index) => (
                      <div key={index} className="p-3 border border-border rounded-md">
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Size
                            </label>
                            <input
                              type="text"
                              placeholder="e.g., S, M, L"
                              value={variant.size}
                              onChange={(e) => updateVariant(index, 'size', e.target.value)}
                              className="w-full px-2 py-1 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Quantity
                            </label>
                            <input
                              type="number"
                              placeholder="0"
                              value={variant.quantity}
                              onChange={(e) => updateVariant(index, 'quantity', parseInt(e.target.value))}
                              className="w-full px-2 py-1 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Price (AED)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={variant.price}
                              onChange={(e) => updateVariant(index, 'price', parseFloat(e.target.value))}
                              className="w-full px-2 py-1 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Cost (AED)
                            </label>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={variant.cost}
                                onChange={(e) => updateVariant(index, 'cost', parseFloat(e.target.value))}
                                className="flex-1 px-2 py-1 border border-input bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                                required
                              />
                              {formData.variants.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeVariant(index)}
                                  className="px-2 py-1 text-red-600 hover:bg-red-100 rounded text-sm"
                                  title="Remove variant"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    {editingProduct ? 'Update Product' : 'Create Product'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setEditingProduct(null)
                      resetForm()
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

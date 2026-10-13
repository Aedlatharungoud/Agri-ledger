import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import api from "../services/api";

import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  FormField,
  Input,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  StatCard,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  SeedProductIcon,
  FertilizerBagIcon,
  PesticideSprayIcon,
} from "../components/ui";

interface Product {
  id: number;
  productName: string;
  category: string | null;
  brandName: string | null;
  unit: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface ProductForm {
  productName: string;
  category: string;
  brandName: string;
  unit: string;
}

const emptyForm: ProductForm = {
  productName: "",
  category: "FERTILIZER",
  brandName: "",
  unit: "BAG",
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // ============================================================
  // LOAD PRODUCTS
  // ============================================================

  const loadProducts = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/products");
      setProducts(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      console.error("Products load error:", err);
      setError("Unable to load products. Please make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // ============================================================
  // KPI STATS
  // ============================================================

  const stats = useMemo(() => {
    const total = products.length;
    const categories = new Set(products.map((p) => p.category).filter(Boolean)).size;
    const brands = new Set(products.map((p) => p.brandName).filter(Boolean)).size;
    const units = new Set(products.map((p) => p.unit).filter(Boolean)).size;

    const seeds = products.filter((p) => p.category?.toUpperCase().includes("SEED")).length;
    const fertilizers = products.filter((p) => p.category?.toUpperCase().includes("FERT")).length;
    const pesticides = products.filter((p) => {
      const c = p.category?.toUpperCase() || "";
      return c.includes("PEST") || c.includes("CHEM") || c.includes("WEED");
    }).length;

    return { total, categories, brands, units, seeds, fertilizers, pesticides };
  }, [products]);

  // ============================================================
  // FILTERED PRODUCTS
  // ============================================================

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      // Category filter
      if (categoryFilter !== "ALL") {
        if (!product.category || product.category.toUpperCase() !== categoryFilter.toUpperCase()) {
          return false;
        }
      }

      // Search query
      if (query) {
        const matchName = product.productName.toLowerCase().includes(query);
        const matchBrand = product.brandName?.toLowerCase().includes(query) ?? false;
        const matchCategory = product.category?.toLowerCase().includes(query) ?? false;
        const matchUnit = product.unit?.toLowerCase().includes(query) ?? false;

        if (!matchName && !matchBrand && !matchCategory && !matchUnit) {
          return false;
        }
      }

      return true;
    });
  }, [products, search, categoryFilter]);

  // Distinct categories
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category.toUpperCase());
    });
    return Array.from(set);
  }, [products]);

  // ============================================================
  // FORM HANDLING
  // ============================================================

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setError("");
    setSuccess("");
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setError("");
    setSuccess("");
    setEditingId(product.id);
    setForm({
      productName: product.productName || "",
      category: product.category || "",
      brandName: product.brandName || "",
      unit: product.unit || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.productName.trim()) {
      setError("Product name is required.");
      return;
    }

    const payload = {
      productName: form.productName.trim(),
      category: form.category.trim() || null,
      brandName: form.brandName.trim() || null,
      unit: form.unit.trim() || null,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.put(`/products/${editingId}`, payload);
        setSuccess("Product updated successfully.");
      } else {
        await api.post("/products", payload);
        setSuccess("Product created successfully.");
      }

      closeModal();
      await loadProducts();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Unable to save product.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this product? Historical purchase records linked to it may be affected.");
    if (!confirmed) return;

    try {
      await api.delete(`/products/${id}`);
      setSuccess("Product deleted successfully.");
      await loadProducts();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to delete product.");
    }
  };

  // Helper category badge
  const getCategoryBadgeVariant = (cat: string | null) => {
    if (!cat) return "neutral";
    const upper = cat.toUpperCase();
    if (upper.includes("FERT")) return "success";
    if (upper.includes("SEED")) return "info";
    if (upper.includes("PEST")) return "warning";
    if (upper.includes("EQUIP")) return "forest";
    return "neutral";
  };

  const getCategoryIcon = (cat: string | null, size = 22) => {
    if (!cat) return <SeedProductIcon size={size} />;
    const upper = cat.toUpperCase();
    if (upper.includes("FERT")) return <FertilizerBagIcon size={size} />;
    if (upper.includes("PEST") || upper.includes("CHEM") || upper.includes("WEED")) return <PesticideSprayIcon size={size} />;
    return <SeedProductIcon size={size} />;
  };

  return (
    <div className="al-page-wrapper">
      {/* Header */}
      <PageHeader
        eyebrow="Inventory Catalogue"
        title="Input Products"
        description="Master registry of seeds, fertilizers, crop protection chemicals, and farming equipment."
        actions={
          <Button variant="primary" icon="+" onClick={openAddModal}>
            Add Product
          </Button>
        }
      />

      {/* Notifications */}
      {error && (
        <Alert variant="error" title="Error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" title="Success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="al-summary-grid">
        <StatCard
          label="Total Products"
          value={stats.total}
          icon={<SeedProductIcon size={24} />}
          subtitle="Catalogued inventory items"
        />

        <StatCard
          label="Seeds & Hybrids"
          value={stats.seeds}
          icon={<SeedProductIcon size={24} />}
          subtitle="Crop varieties catalogued"
          badge={<Badge variant="info">Seeds</Badge>}
        />

        <StatCard
          label="Fertilizers & Nutrients"
          value={stats.fertilizers}
          icon={<FertilizerBagIcon size={24} />}
          subtitle="Nutrient & soil care"
          badge={<Badge variant="success">Fertilizers</Badge>}
        />

        <StatCard
          label="Crop Protection"
          value={stats.pesticides}
          icon={<PesticideSprayIcon size={24} />}
          subtitle="Plant protection inputs"
          badge={<Badge variant="warning">Pesticides</Badge>}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="al-filter-bar">
        <div className="al-filter-search">
          <Input
            placeholder="Search by product name, brand, or unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="al-filter-select">
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {categoriesList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        <div className="al-filter-actions">
          {(search || categoryFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setCategoryFilter("ALL");
              }}
            >
              Reset Filters
            </Button>
          )}
          <Badge variant="neutral">
            {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
          </Badge>
        </div>
      </div>

      {/* Main Table Container */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: "var(--space-6)" }}>
              <Skeleton height="36px" style={{ marginBottom: "12px" }} />
              <Skeleton height="54px" style={{ marginBottom: "8px" }} />
              <Skeleton height="54px" style={{ marginBottom: "8px" }} />
              <Skeleton height="54px" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              icon={<SeedProductIcon size={44} />}
              title={search || categoryFilter !== "ALL" ? "No products match your filter" : "No products in catalogue"}
              description={
                search || categoryFilter !== "ALL"
                  ? "Try searching for another keyword or reset the category filter."
                  : "Add items to your agricultural input catalogue to streamline purchases and billing."
              }
              action={
                search || categoryFilter !== "ALL" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setCategoryFilter("ALL");
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button variant="primary" icon="+" onClick={openAddModal}>
                    Add Product
                  </Button>
                )
              }
            />
          ) : (
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Product Name</Th>
                    <Th>Category</Th>
                    <Th>Brand / Manufacturer</Th>
                    <Th>Standard Unit</Th>
                    <Th align="right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredProducts.map((p) => (
                    <Tr key={p.id}>
                      {/* Name with Visual Icon */}
                      <Td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(47, 133, 90, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {getCategoryIcon(p.category, 20)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                              {p.productName}
                            </div>
                            <div style={{ fontSize: "11.5px", color: "var(--color-text-muted)" }}>
                              {p.brandName || "Standard Grade"}
                            </div>
                          </div>
                        </div>
                      </Td>

                      {/* Category */}
                      <Td>
                        {p.category ? (
                          <Badge variant={getCategoryBadgeVariant(p.category)}>
                            {p.category}
                          </Badge>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)" }}>—</span>
                        )}
                      </Td>

                      {/* Brand */}
                      <Td>
                        {p.brandName ? (
                          <span style={{ fontWeight: 500, color: "var(--color-text)" }}>{p.brandName}</span>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>Generic / Unbranded</span>
                        )}
                      </Td>

                      {/* Unit */}
                      <Td>
                        {p.unit ? (
                          <Badge variant="neutral">
                            {p.unit}
                          </Badge>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)" }}>—</span>
                        )}
                      </Td>

                      {/* Actions */}
                      <Td align="right">
                        <div className="al-table-actions">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(p)}
                            aria-label="Edit Product"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(p.id)}
                            aria-label="Delete Product"
                            style={{ color: "var(--color-danger)" }}
                          >
                            Delete
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </CardBody>
      </Card>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingId !== null ? "Edit Catalogue Product" : "Add Catalogue Product"}
        maxWidth="520px"
        footer={
          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", width: "100%" }}>
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const formEl = document.getElementById("product-form") as HTMLFormElement;
                if (formEl) formEl.requestSubmit();
              }}
              loading={saving}
            >
              {editingId !== null ? "Update Product" : "Save Product"}
            </Button>
          </div>
        }
      >
        <form id="product-form" onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <FormField label="Product Name" required>
              <Input
                name="productName"
                placeholder="e.g. Urea 46%, Glyphosate, DAP"
                value={form.productName}
                onChange={handleChange}
              />
            </FormField>

            <FormField label="Category" required>
              <Select
                name="category"
                value={form.category}
                onChange={handleChange}
              >
                <option value="FERTILIZER">Fertilizer</option>
                <option value="SEEDS">Seeds & Saplings</option>
                <option value="PESTICIDE">Pesticide / Insecticide</option>
                <option value="FUNGICIDE">Fungicide</option>
                <option value="HERBICIDE">Herbicide / Weedicide</option>
                <option value="EQUIPMENT">Tools & Equipment</option>
                <option value="OTHER">Other Supplies</option>
              </Select>
            </FormField>

            <FormField label="Brand / Manufacturer">
              <Input
                name="brandName"
                placeholder="e.g. IFFCO, Bayer, Syngenta"
                value={form.brandName}
                onChange={handleChange}
              />
            </FormField>

            <FormField label="Standard Unit of Measure">
              <Select
                name="unit"
                value={form.unit}
                onChange={handleChange}
              >
                <option value="BAG">BAG (Bags / Sacks)</option>
                <option value="KG">KG (Kilograms)</option>
                <option value="LITER">LITER (Liquid Litres)</option>
                <option value="PACKET">PACKET (Packets / Pouches)</option>
                <option value="BOTTLE">BOTTLE</option>
                <option value="QUINTAL">QUINTAL (100 KG)</option>
                <option value="TON">TON (1,000 KG)</option>
                <option value="PIECE">PIECE (Count)</option>
              </Select>
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
}
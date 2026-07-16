import { useEffect, useState } from "react";
import { PackagePlus, Pencil, Trash2, X, Check, PackageX } from "lucide-react";
import api from "../api/client";
import { useToast } from "../context/ToastContext";
import AppShell from "../components/AppShell";
import Card from "../components/Card";
import { Badge } from "../components/Badge";
import ConfirmDialog from "../components/ConfirmDialog";
import LoadingScreen from "../components/LoadingScreen";

const emptyForm = { name: "", category: "", price: "", cost_price: "", stock_quantity: "", reorder_point: "10" };

const inputClass =
  "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-shadow";

export default function Products() {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  async function loadProducts() {
    const { data } = await api.get("/products/");
    setProducts(data);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      await api.post("/products/", {
        name: form.name,
        category: form.category || null,
        price: Number(form.price),
        cost_price: Number(form.cost_price),
        stock_quantity: Number(form.stock_quantity) || 0,
        reorder_point: Number(form.reorder_point) || 10,
      });
      showToast(`${form.name} added to products`);
      setForm(emptyForm);
      await loadProducts();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create the product.");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(p) {
    setEditingId(p.product_id);
    setEditForm({
      name: p.name,
      category: p.category || "",
      price: String(p.price),
      cost_price: String(p.cost_price),
      stock_quantity: String(p.stock_quantity),
      reorder_point: String(p.reorder_point),
    });
  }

  async function saveEdit(productId) {
    setSaving(true);
    setError("");
    try {
      await api.put(`/products/${productId}`, {
        name: editForm.name,
        category: editForm.category || null,
        price: Number(editForm.price),
        cost_price: Number(editForm.cost_price),
        stock_quantity: Number(editForm.stock_quantity),
        reorder_point: Number(editForm.reorder_point),
      });
      showToast(`${editForm.name} updated`);
      setEditingId(null);
      await loadProducts();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const name = pendingDelete.name;
    try {
      await api.delete(`/products/${pendingDelete.product_id}`);
      showToast(`${name} deleted`);
      setPendingDelete(null);
      await loadProducts();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not delete this product.");
      setPendingDelete(null);
    }
  }

  if (loading) {
    return <LoadingScreen label="Loading products..." />;
  }

  return (
    <AppShell title="Products" subtitle="Manage prices, stock, and reorder points">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        <Card title="Add product">
          <form onSubmit={handleCreate} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
                placeholder="Product name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputClass}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Price (GHS)</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cost price (GHS)</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Stock</label>
              <input
                type="number"
                min="0"
                value={form.stock_quantity}
                onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Reorder point</label>
              <input
                type="number"
                min="0"
                value={form.reorder_point}
                onChange={(e) => setForm({ ...form, reorder_point: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="col-span-2 sm:col-span-3 lg:col-span-6">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors shadow-card"
              >
                <PackagePlus className="w-4 h-4" strokeWidth={2} />
                {creating ? "Adding..." : "Add product"}
              </button>
            </div>
          </form>
        </Card>

        <Card title="All products">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <PackageX className="w-8 h-8 mb-2" strokeWidth={1.5} />
              <p className="text-sm">No products yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="pb-3 px-2 font-medium">Name</th>
                    <th className="pb-3 px-2 font-medium">Category</th>
                    <th className="pb-3 px-2 font-medium">Price</th>
                    <th className="pb-3 px-2 font-medium">Cost</th>
                    <th className="pb-3 px-2 font-medium">Stock</th>
                    <th className="pb-3 px-2 font-medium">Reorder pt.</th>
                    <th className="pb-3 px-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map((p) =>
                    editingId === p.product_id ? (
                      <tr key={p.product_id} className="bg-blue-50/40">
                        <td className="py-2 px-2">
                          <input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className={inputClass}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            value={editForm.category}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                            className={inputClass}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.price}
                            onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                            className={`${inputClass} w-24`}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.cost_price}
                            onChange={(e) => setEditForm({ ...editForm, cost_price: e.target.value })}
                            className={`${inputClass} w-24`}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={editForm.stock_quantity}
                            onChange={(e) => setEditForm({ ...editForm, stock_quantity: e.target.value })}
                            className={`${inputClass} w-20`}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={editForm.reorder_point}
                            onChange={(e) => setEditForm({ ...editForm, reorder_point: e.target.value })}
                            className={`${inputClass} w-20`}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => saveEdit(p.product_id)}
                              disabled={saving}
                              aria-label="Save changes"
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                            >
                              <Check className="w-4 h-4" strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              aria-label="Cancel editing"
                              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors"
                            >
                              <X className="w-4 h-4" strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={p.product_id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-2 text-gray-900">{p.name}</td>
                        <td className="py-3 px-2 text-gray-500">{p.category || "-"}</td>
                        <td className="py-3 px-2 text-gray-900 tabular-nums">GHS {Number(p.price).toFixed(2)}</td>
                        <td className="py-3 px-2 text-gray-500 tabular-nums">GHS {Number(p.cost_price).toFixed(2)}</td>
                        <td className="py-3 px-2 tabular-nums">
                          {p.low_stock ? (
                            <Badge tone="critical">{p.stock_quantity}</Badge>
                          ) : (
                            <span className="text-gray-700">{p.stock_quantity}</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-gray-500 tabular-nums">{p.reorder_point}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => startEdit(p)}
                              aria-label={`Edit ${p.name}`}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            >
                              <Pencil className="w-4 h-4" strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => setPendingDelete(p)}
                              aria-label={`Delete ${p.name}`}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <Trash2 className="w-4 h-4" strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete ${pendingDelete?.name}?`}
        description="This can't be undone. Products with sales history can't be deleted - set stock to 0 instead."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </AppShell>
  );
}

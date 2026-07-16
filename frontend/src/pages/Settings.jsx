import { Fragment, useEffect, useState } from "react";
import { UserPlus, Trash2, Pencil, Check, X, Users as UsersIcon } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AppShell from "../components/AppShell";
import Card from "../components/Card";
import { Badge } from "../components/Badge";
import ConfirmDialog from "../components/ConfirmDialog";
import { Bone, SkeletonTable } from "../components/Skeleton";

const emptyForm = { name: "", email: "", password: "", role: "cashier" };

const inputClass =
  "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-shadow";

export default function Settings() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    const { data } = await api.get("/auth/users");
    setUsers(data);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      await api.post("/auth/create-user", form);
      showToast(`${form.role === "owner" ? "Owner" : "Cashier"} account created for ${form.name}`);
      setForm(emptyForm);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create the account.");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(u) {
    setEditingId(u.user_id);
    setEditForm({ name: u.name, email: u.email, role: u.role, password: "" });
    setError("");
  }

  async function saveEdit(userId) {
    setSaving(true);
    setError("");
    try {
      const payload = { name: editForm.name, email: editForm.email, role: editForm.role };
      if (editForm.password.trim()) payload.password = editForm.password.trim();
      await api.put(`/auth/users/${userId}`, payload);
      showToast(`${editForm.name}'s account updated`);
      setEditingId(null);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleteError("");
    const name = pendingDelete.name;
    try {
      await api.delete(`/auth/users/${pendingDelete.user_id}`);
      showToast(`${name}'s account was removed`);
      setPendingDelete(null);
      await loadUsers();
    } catch (err) {
      setDeleteError(err.response?.data?.detail || "Could not remove this account.");
      setPendingDelete(null);
    }
  }

  return (
    <AppShell title="Settings" subtitle="Manage staff accounts and access">
      {loading ? (
        <div className="space-y-6 max-w-3xl">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-card p-6">
            <Bone className="h-4 w-32 mb-5" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Bone key={i} className="h-10" />
              ))}
            </div>
          </div>
          <SkeletonTable rows={4} cols={4} title />
        </div>
      ) : (
      <div className="space-y-6 max-w-3xl">
        {(error || deleteError) && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
            {error || deleteError}
          </div>
        )}

        <Card title="Add staff account">
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-shadow"
                placeholder="e.g. Ama Mensah"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-shadow"
                placeholder="ama@smartretail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Temporary password</label>
              <input
                type="text"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-shadow"
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              >
                <option value="cashier">Cashier</option>
                <option value="owner">Owner</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors shadow-card"
              >
                <UserPlus className="w-4 h-4" strokeWidth={2} />
                {creating ? "Creating..." : "Create account"}
              </button>
            </div>
          </form>
        </Card>

        <Card title="Staff">
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <UsersIcon className="w-8 h-8 mb-2" strokeWidth={1.5} />
              <p className="text-sm">No accounts yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="pb-3 px-2 font-medium">Name</th>
                    <th className="pb-3 px-2 font-medium">Email</th>
                    <th className="pb-3 px-2 font-medium">Role</th>
                    <th className="pb-3 px-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) =>
                    editingId === u.user_id ? (
                      <Fragment key={u.user_id}>
                        <tr className="bg-blue-50/40">
                          <td className="py-2 px-2">
                            <input
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className={inputClass}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                              className={inputClass}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <select
                              value={editForm.role}
                              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                              className={inputClass}
                            >
                              <option value="cashier">Cashier</option>
                              <option value="owner">Owner</option>
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => saveEdit(u.user_id)}
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
                        <tr className="bg-blue-50/40">
                          <td colSpan={4} className="px-2 pb-3">
                            <input
                              type="text"
                              value={editForm.password}
                              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                              placeholder="New password (leave blank to keep current)"
                              className={inputClass}
                            />
                          </td>
                        </tr>
                      </Fragment>
                    ) : (
                      <tr key={u.user_id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-2 text-gray-900">
                          {u.name}
                          {u.user_id === currentUser.id && <span className="text-gray-400"> (you)</span>}
                        </td>
                        <td className="py-3 px-2 text-gray-500">{u.email}</td>
                        <td className="py-3 px-2">
                          <Badge tone={u.role === "owner" ? "violet" : "info"} className="capitalize">
                            {u.role}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => startEdit(u)}
                              aria-label={`Edit ${u.name}`}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            >
                              <Pencil className="w-4 h-4" strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => setPendingDelete(u)}
                              aria-label={`Remove ${u.name}`}
                              className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Remove ${pendingDelete?.name}?`}
        description="They'll immediately lose access to SmartRetail. This can't be undone."
        confirmLabel="Remove"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </AppShell>
  );
}

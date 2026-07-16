import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  LayoutDashboard,
  LogOut,
  Search,
  Minus,
  Plus,
  X,
  User,
  Banknote,
  Smartphone,
  CreditCard,
  CheckCircle2,
  Printer,
  Loader2,
  PackageX,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import LoadingScreen from "../components/LoadingScreen";
import ConfirmDialog from "../components/ConfirmDialog";

const fmt = (n) => `GHS ${Number(n).toFixed(2)}`;

const STORE_NAME = "SmartRetail";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "mobile_money", label: "Mobile Money", icon: Smartphone },
  { value: "card", label: "Card", icon: CreditCard },
];

const MOMO_PROVIDERS = [
  { value: "mtn", label: "MTN Mobile Money" },
  { value: "vod", label: "Telecel Cash" },
  { value: "atl", label: "AirtelTigo Money" },
];

const MOMO_POLL_INTERVAL_MS = 2500;
const MOMO_MAX_POLL_ATTEMPTS = 40; // ~100s

function ProductCard({ product, qtyInCart, onAdd }) {
  const outOfStock = product.stock_quantity <= 0;
  const maxedOut = qtyInCart >= product.stock_quantity;
  const disabled = outOfStock || maxedOut;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onAdd}
      className={`relative text-left bg-white rounded-2xl border p-4 transition-all ${
        disabled
          ? "border-gray-150 opacity-50 cursor-not-allowed"
          : "border-gray-150 hover:border-blue-300 hover:shadow-card-hover shadow-card"
      }`}
    >
      {qtyInCart > 0 && (
        <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-semibold w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white">
          {qtyInCart}
        </span>
      )}
      <p className="text-sm font-medium text-gray-900 line-clamp-2">{product.name}</p>
      {product.category && <p className="text-xs text-gray-400 mt-0.5">{product.category}</p>}
      <div className="flex items-center justify-between mt-3">
        <span className="text-sm font-semibold text-gray-900">{fmt(product.price)}</span>
        <span className={`text-xs ${product.low_stock ? "text-status-critical" : "text-gray-400"}`}>
          {outOfStock ? "Out of stock" : `${product.stock_quantity} in stock`}
        </span>
      </div>
    </button>
  );
}

export default function POS() {
  const { user, logout } = useAuth();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]); // [{ product, quantity }]
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);

  const [momoPhone, setMomoPhone] = useState("");
  const [momoProvider, setMomoProvider] = useState("mtn");
  const [momoStatus, setMomoStatus] = useState("idle"); // idle | initiating | waiting | otp | submitting_otp
  const [momoReference, setMomoReference] = useState(null);
  const [momoOtp, setMomoOtp] = useState("");
  const momoCancelRef = useRef(false);

  async function loadProducts() {
    const res = await api.get("/products/");
    setProducts(res.data);
  }

  useEffect(() => {
    Promise.all([api.get("/products/"), api.get("/customers/")])
      .then(([productsRes, customersRes]) => {
        setProducts(productsRes.data);
        setCustomers(customersRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const cartQtyFor = (productId) =>
    cart.find((i) => i.product.product_id === productId)?.quantity || 0;

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.product_id === product.product_id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) return prev;
        return prev.map((i) =>
          i.product.product_id === product.product_id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      if (product.stock_quantity <= 0) return prev;
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId, delta) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product.product_id !== productId) return i;
          const next = Math.min(i.quantity + delta, i.product.stock_quantity);
          return { ...i, quantity: next };
        })
        .filter((i) => i.quantity > 0)
    );
  }

  function removeItem(productId) {
    setCart((prev) => prev.filter((i) => i.product.product_id !== productId));
  }

  const total = cart.reduce((sum, i) => sum + i.quantity * Number(i.product.price), 0);

  function productNameById(id) {
    return products.find((p) => p.product_id === id)?.name || `Product #${id}`;
  }

  async function handleCheckout(paymentReference = null) {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        items: cart.map((i) => ({ product_id: i.product.product_id, quantity: i.quantity })),
        payment_method: paymentMethod,
        customer_id: customerId ? Number(customerId) : null,
        payment_reference: paymentReference,
      };
      const { data } = await api.post("/transactions/", payload);
      setReceipt(data);
      setCart([]);
      setCustomerId("");
      setPaymentMethod("cash");
      setMomoPhone("");
      setMomoProvider("mtn");
      setMomoStatus("idle");
      await loadProducts();
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong processing the sale.");
    } finally {
      setSubmitting(false);
    }
  }

  async function pollMomoStatus(reference) {
    for (let attempt = 0; attempt < MOMO_MAX_POLL_ATTEMPTS; attempt++) {
      if (momoCancelRef.current) return;
      await new Promise((resolve) => setTimeout(resolve, MOMO_POLL_INTERVAL_MS));
      if (momoCancelRef.current) return;

      try {
        const { data } = await api.get(`/payments/momo/status/${reference}`);
        if (data.status === "success") {
          setMomoStatus("idle");
          await handleCheckout(reference);
          return;
        }
        if (data.status === "send_otp") {
          setMomoReference(reference);
          setMomoStatus("otp");
          return;
        }
        if (data.status === "failed" || data.status === "abandoned") {
          setMomoStatus("idle");
          setError("The customer's mobile money payment was not completed. Ask them to try again, or choose a different payment method.");
          return;
        }
        // still pending (e.g. "pay_offline") - keep polling
      } catch {
        // transient network/API error - keep polling rather than aborting immediately
      }
    }
    setMomoStatus("idle");
    setError("Payment confirmation timed out. Ask the customer to check their phone, or try again.");
  }

  async function handleMomoInitiate() {
    if (!momoPhone.trim()) {
      setError("Enter the customer's mobile money number.");
      return;
    }
    setError("");
    setMomoStatus("initiating");
    momoCancelRef.current = false;
    try {
      const { data } = await api.post("/payments/momo/initiate", {
        amount: total,
        phone: momoPhone.trim(),
        provider: momoProvider,
      });
      if (data.status === "send_otp") {
        setMomoReference(data.reference);
        setMomoStatus("otp");
        return;
      }
      setMomoStatus("waiting");
      pollMomoStatus(data.reference);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not start the mobile money payment.");
      setMomoStatus("idle");
    }
  }

  async function handleMomoOtpSubmit() {
    if (!momoOtp.trim()) {
      setError("Enter the code the customer received.");
      return;
    }
    setError("");
    setMomoStatus("submitting_otp");
    try {
      const { data } = await api.post("/payments/momo/submit-otp", {
        reference: momoReference,
        otp: momoOtp.trim(),
      });
      setMomoOtp("");
      if (data.status === "success") {
        setMomoStatus("idle");
        await handleCheckout(momoReference);
        return;
      }
      if (data.status === "failed" || data.status === "abandoned") {
        setMomoStatus("idle");
        setError("The customer's mobile money payment was not completed. Ask them to try again, or choose a different payment method.");
        return;
      }
      setMomoStatus("waiting");
      pollMomoStatus(momoReference);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not verify that code. Ask the customer to try again.");
      setMomoStatus("otp");
    }
  }

  function cancelMomo() {
    momoCancelRef.current = true;
    setMomoStatus("idle");
    setMomoOtp("");
    setMomoReference(null);
  }

  if (loading) {
    return <LoadingScreen label="Loading POS..." />;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 print:h-auto print:bg-white animate-[fadeInUp_220ms_ease-out]">
      <header className="bg-white border-b border-gray-150 px-6 py-3.5 flex items-center justify-between shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <ShoppingBag className="w-4.5 h-4.5 text-white" strokeWidth={2.25} />
          </div>
          <span className="font-semibold text-gray-900">SmartRetail</span>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-medium">Point of Sale</span>
        </div>
        <div className="flex items-center gap-4">
          {user.role === "owner" && (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" strokeWidth={2} />
              Dashboard
            </Link>
          )}
          <div className="flex items-center gap-2 pl-4 border-l border-gray-150">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
              {user.name?.[0]?.toUpperCase() || "?"}
            </div>
            <span className="text-sm text-gray-600">{user.name}</span>
            <button
              onClick={() => setConfirmingLogout(true)}
              aria-label="Sign out"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden print:hidden">
        {/* Left panel: search + product grid (~60%) */}
        <section className="w-full md:w-[60%] flex flex-col p-6 overflow-hidden">
          <div className="relative mb-4 shrink-0">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={2} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name or category..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-shadow"
            />
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center mt-16 text-gray-400">
                <PackageX className="w-8 h-8 mb-2" strokeWidth={1.5} />
                <p className="text-sm">No products match your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pb-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.product_id}
                    product={product}
                    qtyInCart={cartQtyFor(product.product_id)}
                    onAdd={() => addToCart(product)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right panel: receipt (~40%) */}
        <aside className="hidden md:flex md:w-[40%] bg-white border-l border-gray-150 flex-col p-6">
          {receipt ? (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto">
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-50 text-status-good rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-7 h-7" strokeWidth={2} />
                  </div>
                  <h3 className="font-semibold text-gray-900">Sale completed</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Transaction #{receipt.transaction_id} · {new Date(receipt.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="border-t border-gray-100 divide-y divide-gray-50 mt-2">
                  {receipt.items.map((it) => (
                    <div key={it.item_id} className="flex justify-between py-2.5 text-sm">
                      <span className="text-gray-600">
                        {productNameById(it.product_id)} × {it.quantity}
                      </span>
                      <span className="text-gray-900 font-medium">
                        {fmt(it.subtotal ?? it.unit_price * it.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-3 mt-2 border-t border-gray-200">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-gray-900">{fmt(receipt.total_amount)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-2 capitalize">
                  Paid via {receipt.payment_method.replace("_", " ")}
                  {receipt.payment_reference && ` · Ref: ${receipt.payment_reference}`}
                </p>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors"
                >
                  <Printer className="w-4 h-4" strokeWidth={2} />
                  Print Receipt
                </button>
                <button
                  onClick={() => setReceipt(null)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors shadow-card"
                >
                  New Sale
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <h3 className="font-semibold text-gray-900 mb-4">Current Sale</h3>

              <div className="relative mb-4 shrink-0">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2} />
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 appearance-none bg-white"
                >
                  <option value="">Walk-in customer</option>
                  {customers.map((c) => (
                    <option key={c.customer_id} value={c.customer_id}>
                      {c.name}
                      {c.phone_number ? ` — ${c.phone_number}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center mt-8">
                    No items added yet. Tap a product to add it.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {cart.map((item) => (
                      <div key={item.product.product_id} className="flex items-center gap-2 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                          <p className="text-xs text-gray-400">{fmt(item.product.price)} each</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => updateQty(item.product.product_id, -1)}
                            aria-label={`Decrease quantity of ${item.product.name}`}
                            className="w-6 h-6 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" strokeWidth={2.5} />
                          </button>
                          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQty(item.product.product_id, 1)}
                            disabled={item.quantity >= item.product.stock_quantity}
                            aria-label={`Increase quantity of ${item.product.name}`}
                            className="w-6 h-6 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" strokeWidth={2.5} />
                          </button>
                        </div>
                        <p className="w-20 text-right text-sm font-medium text-gray-900 shrink-0">
                          {fmt(item.quantity * item.product.price)}
                        </p>
                        <button
                          onClick={() => removeItem(item.product.product_id)}
                          className="text-gray-300 hover:text-red-500 shrink-0"
                          aria-label="Remove item"
                        >
                          <X className="w-4 h-4" strokeWidth={2} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="shrink-0 pt-4 border-t border-gray-150 mt-2">
                <div className="flex justify-between mb-4">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-lg text-gray-900">{fmt(total)}</span>
                </div>

                <div className="flex gap-2 mb-4">
                  {PAYMENT_METHODS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={momoStatus !== "idle"}
                      onClick={() => {
                        setPaymentMethod(opt.value);
                        setError("");
                      }}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        paymentMethod === opt.value
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <opt.icon className="w-4 h-4" strokeWidth={2} />
                      {opt.label}
                    </button>
                  ))}
                </div>

                {paymentMethod === "mobile_money" && (
                  <div className="space-y-2 mb-4">
                    <input
                      type="tel"
                      value={momoPhone}
                      onChange={(e) => setMomoPhone(e.target.value)}
                      disabled={momoStatus !== "idle"}
                      placeholder="Customer's MoMo number, e.g. 0551234567"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:bg-gray-50"
                    />
                    <select
                      value={momoProvider}
                      onChange={(e) => setMomoProvider(e.target.value)}
                      disabled={momoStatus !== "idle"}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:bg-gray-50 bg-white"
                    >
                      {MOMO_PROVIDERS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-2.5 rounded-xl mb-4">
                    {error}
                  </div>
                )}

                {paymentMethod === "mobile_money" && (momoStatus === "otp" || momoStatus === "submitting_otp") ? (
                  <div className="py-2">
                    <p className="text-sm text-gray-600 mb-2 text-center">
                      Enter the code sent to the customer's phone
                    </p>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={momoOtp}
                      onChange={(e) => setMomoOtp(e.target.value)}
                      disabled={momoStatus === "submitting_otp"}
                      placeholder="OTP code"
                      autoFocus
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:bg-gray-50 mb-2"
                    />
                    <button
                      onClick={handleMomoOtpSubmit}
                      disabled={momoStatus === "submitting_otp"}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors text-sm shadow-card"
                    >
                      {momoStatus === "submitting_otp" ? "Verifying..." : "Submit code"}
                    </button>
                    <div className="text-center">
                      <button onClick={cancelMomo} className="text-xs text-gray-400 hover:text-gray-600 mt-2">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : paymentMethod === "mobile_money" && momoStatus === "waiting" ? (
                  <div className="text-center py-2">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin mx-auto mb-2" strokeWidth={2.5} />
                    <p className="text-sm text-gray-600">Waiting for the customer to approve on their phone...</p>
                    <button onClick={cancelMomo} className="text-xs text-gray-400 hover:text-gray-600 mt-2">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => (paymentMethod === "mobile_money" ? handleMomoInitiate() : handleCheckout())}
                    disabled={cart.length === 0 || submitting || momoStatus === "initiating"}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors text-sm shadow-card"
                  >
                    {momoStatus === "initiating"
                      ? "Sending request..."
                      : paymentMethod === "mobile_money"
                      ? "Request Payment"
                      : submitting
                      ? "Processing..."
                      : "Process Payment"}
                  </button>
                )}
              </div>
            </div>
          )}
        </aside>
      </main>

      {receipt && (
        <div className="hidden print:block max-w-xs mx-auto py-6 font-mono text-black">
          <div className="text-center mb-4">
            <p className="text-lg font-bold tracking-wide">{STORE_NAME.toUpperCase()}</p>
            <p className="text-xs">Point of Sale Receipt</p>
          </div>
          <div className="border-t border-b border-dashed border-black py-2 mb-2 text-xs space-y-0.5">
            <div className="flex justify-between">
              <span>Receipt #</span>
              <span>{receipt.transaction_id}</span>
            </div>
            <div className="flex justify-between">
              <span>Date</span>
              <span>{new Date(receipt.created_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier</span>
              <span>{user.name}</span>
            </div>
          </div>
          <div className="border-b border-dashed border-black pb-2 mb-2 text-xs space-y-1.5">
            {receipt.items.map((it) => (
              <div key={it.item_id}>
                <div>{productNameById(it.product_id)}</div>
                <div className="flex justify-between">
                  <span>
                    {it.quantity} x {fmt(it.unit_price)}
                  </span>
                  <span>{fmt(it.subtotal ?? it.unit_price * it.quantity)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-bold text-sm mb-2">
            <span>TOTAL</span>
            <span>{fmt(receipt.total_amount)}</span>
          </div>
          <div className="text-xs mb-6 space-y-0.5">
            <div className="flex justify-between capitalize">
              <span>Paid via</span>
              <span>{receipt.payment_method.replace("_", " ")}</span>
            </div>
            {receipt.payment_reference && (
              <div className="flex justify-between">
                <span>Ref</span>
                <span>{receipt.payment_reference}</span>
              </div>
            )}
          </div>
          <div className="text-center text-xs">
            <p>Thank you for shopping with us!</p>
            <p className="mt-1">Powered by SmartRetail</p>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmingLogout}
        title="Sign out of SmartRetail?"
        description={
          cart.length > 0
            ? `You have ${cart.length} item${cart.length === 1 ? "" : "s"} in your cart that will be lost.`
            : "You'll need to sign in again to continue."
        }
        confirmLabel="Sign out"
        onConfirm={logout}
        onCancel={() => setConfirmingLogout(false)}
      />
    </div>
  );
}

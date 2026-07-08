"use client";

import { useMemo, useState } from "react";
import { CreditCard, Minus, Plus, QrCode, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { produtos } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

type CartItem = {
  productId: number;
  quantity: number;
};

function toNumber(value: number | string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function Checkout() {
  const [cart, setCart] = useState<CartItem[]>([
    { productId: 1, quantity: 1 },
    { productId: 4, quantity: 2 }
  ]);
  const [discount, setDiscount] = useState(20);
  const [payment, setPayment] = useState("PIX");

  const items = cart.map((cartItem) => ({
    ...cartItem,
    product: produtos.find((product) => product.id === cartItem.productId)!
  }));

  const subtotal = useMemo(() => items.reduce((total, item) => total + toNumber(item.product.preco_venda) * item.quantity, 0), [items]);
  const total = Math.max(0, subtotal - discount);

  function changeQuantity(productId: number, delta: number) {
    setCart((current) =>
      current.map((item) => (item.productId === productId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item))
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <section className="rounded border bg-card p-5 shadow-subtle">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Itens do atendimento</h2>
            <p className="text-sm text-muted-foreground">Venda de peças e serviços no balcão</p>
          </div>
          <Button variant="secondary">
            <Plus className="h-4 w-4" />
            Item
          </Button>
        </div>

        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item.productId} className="grid gap-3 rounded border p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <div>
                <p className="font-semibold">{item.product.nome}</p>
                <p className="text-sm text-muted-foreground">{item.product.categoria}</p>
              </div>
              <div className="flex h-10 w-32 items-center justify-between rounded border px-2">
                <Button aria-label="Reduzir quantidade" size="icon" variant="ghost" onClick={() => changeQuantity(item.productId, -1)}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold">{item.quantity}</span>
                <Button aria-label="Aumentar quantidade" size="icon" variant="ghost" onClick={() => changeQuantity(item.productId, 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <strong className="text-right">{formatCurrency(toNumber(item.product.preco_venda) * item.quantity)}</strong>
            </div>
          ))}
        </div>
      </section>

      <aside className="rounded border bg-card p-5 shadow-subtle">
        <h2 className="font-semibold">Resumo</h2>
        <div className="mt-5 grid gap-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <Input label="Desconto" type="number" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} />
          <div className="flex justify-between border-t pt-4 text-lg">
            <span className="font-semibold">Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {[
            { label: "PIX", icon: QrCode },
            { label: "Crédito", icon: CreditCard },
            { label: "Débito", icon: ReceiptText }
          ].map((method) => {
            const Icon = method.icon;
            return (
              <button
                key={method.label}
                className={`grid h-20 place-items-center rounded border text-sm font-medium transition-colors ${
                  payment === method.label ? "border-primary bg-red-50 text-primary dark:bg-red-950/30" : "hover:bg-muted"
                }`}
                onClick={() => setPayment(method.label)}
              >
                <Icon className="h-5 w-5" />
                {method.label}
              </button>
            );
          })}
        </div>

        <Button className="mt-6 w-full">
          <ReceiptText className="h-4 w-4" />
          Finalizar venda
        </Button>
      </aside>
    </div>
  );
}

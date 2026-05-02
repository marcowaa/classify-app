import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface WalletData {
  id: string;
  parentId: string;
  parentEmail: string;
  parentName: string;
  balance: number;
  totalDeposited: number;
  totalSpent: number;
  updatedAt: string;
}

interface WalletDetails {
  wallet: {
    balance: number;
    totalDeposited: number;
    totalSpent: number;
    updatedAt: string;
  };
  deposits: Array<{
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    completedAt?: string;
  }>;
  orders: Array<{
    id: string;
    pointsPrice: number;
    status: string;
    createdAt: string;
  }>;
}

export function WalletsTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNote, setDepositNote] = useState("");

  const { data: wallets, isLoading } = useQuery({
    queryKey: ["admin-wallets"],
    queryFn: async () => {
      const res = await fetch("/api/admin/wallets", {
        headers: { Authorization: `Bearer ${token}` },
      });
        const json = await res.json();
        if (!res.ok) return [];
        return (json?.data || []) as WalletData[];
    },
    enabled: !!token,
  });

  const { data: walletDetails, isLoading: isDetailsLoading } = useQuery({
    queryKey: ["wallet-details", selectedParentId],
    queryFn: async () => {
      if (!selectedParentId) return null;
      const res = await fetch(`/api/admin/wallets/${selectedParentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
        const json = await res.json();
        if (!res.ok) return null;
        return (json?.data || null) as WalletDetails | null;
    },
    enabled: !!token && !!selectedParentId,
  });

  const addDepositMutation = useMutation({
    mutationFn: async () => {
      if (!selectedParentId || !depositAmount) {
        throw new Error("Parent ID and amount are required");
      }
      const res = await fetch(`/api/admin/wallets/${selectedParentId}/deposit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(depositAmount),
          note: depositNote,
        }),
      });
      if (!res.ok) throw new Error("Failed to add deposit");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-wallets"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-details", selectedParentId] });
      setIsDepositModalOpen(false);
      setDepositAmount("");
      setDepositNote("");
    },
  });

  if (isLoading) return <div className="p-4">Loading wallets...</div>;

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold">Wallet Management</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wallets List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">All Wallets</h3>
          </div>
          <div className="overflow-y-auto max-h-96">
            {wallets?.map((wallet) => (
              <div
                key={wallet.id}
                onClick={() => setSelectedParentId(wallet.parentId)}
                className={`p-4 border-b cursor-pointer transition-colors ${
                  selectedParentId === wallet.parentId
                    ? "bg-blue-50 border-l-4 border-l-blue-500"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{wallet.parentName}</p>
                    <p className="text-sm text-gray-600">{wallet.parentEmail}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">${wallet.balance.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Balance</p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-600">Deposited:</p>
                    <p className="font-semibold text-green-600">${wallet.totalDeposited.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Spent:</p>
                    <p className="font-semibold text-red-600">${wallet.totalSpent.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wallet Details */}
        {selectedParentId && walletDetails && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Wallet Details</h3>
                <button
                  onClick={() => setIsDepositModalOpen(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Add Deposit
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Balance:</span>
                  <span className="font-bold text-lg text-blue-600">
                    ${walletDetails.wallet.balance.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Deposited:</span>
                  <span className="font-bold text-green-600">
                    ${walletDetails.wallet.totalDeposited.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Spent:</span>
                  <span className="font-bold text-red-600">
                    ${walletDetails.wallet.totalSpent.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Updated: {new Date(walletDetails.wallet.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Recent Deposits */}
            {walletDetails.deposits.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h4 className="font-semibold mb-3">Recent Deposits</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {walletDetails.deposits.slice(0, 5).map((deposit) => (
                    <div key={deposit.id} className="flex justify-between text-sm p-2 border-b">
                      <div>
                        <p className="font-medium">${deposit.amount.toFixed(2)}</p>
                        <p className="text-gray-600">
                          {new Date(deposit.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          deposit.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {deposit.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Deposit Modal */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Add Deposit</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Admin adjustment"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => addDepositMutation.mutate()}
                disabled={!depositAmount || addDepositMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {addDepositMutation.isPending ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

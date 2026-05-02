import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gamepad2 } from "lucide-react";
import { ChildGameManager } from "./ChildGameManager";

interface ParentData {
  id: string;
  name: string;
  totalPoints: number;
  createdAt: string;
  tasksCount: number;
  parents: Array<{
    parentId: string;
    parentName: string;
    parentEmail: string;
  }>;
}

interface ChildData {
  id: string;
  name: string;
  totalPoints: number;
  createdAt: string;
  tasksCount: number;
  parents: Array<{
    parentId: string;
    parentName: string;
    parentEmail: string;
  }>;
}

export function UsersTab({ token }: { token: string }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [gameManagerChild, setGameManagerChild] = useState<{ id: string; name: string } | null>(null);

  const { data: children, isLoading } = useQuery({
    queryKey: ["admin-children"],
    queryFn: async () => {
      const res = await fetch("/api/admin/children", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) return [];
      return (json?.data || []) as ChildData[];
    },
    enabled: !!token,
  });

  const filteredChildren = children?.filter((child) => {
    const query = searchTerm.toLowerCase();
    const nameMatch = child.name?.toLowerCase().includes(query);
    const parentMatch = child.parents?.some(
      (parent) =>
        parent.parentName?.toLowerCase().includes(query) ||
        parent.parentEmail?.toLowerCase().includes(query)
    );
    return Boolean(nameMatch || parentMatch);
  }
  ) || [];

  if (isLoading) return <div className="p-4">Loading children...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Children Management</h2>
        <input
          type="text"
          placeholder="Search by child or parent..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-600"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Child Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Parent</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Points</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Tasks</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Joined</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Games</th>
            </tr>
          </thead>
          <tbody>
            {filteredChildren?.map((child) => (
              <tr key={child.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">
                  <span className="font-medium text-gray-900">{child.name}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {child.parents?.length > 0 ? (
                    <div className="space-y-1">
                      {child.parents.map((parent) => (
                        <div key={parent.parentId}>
                          <div className="font-medium">{parent.parentName}</div>
                          <div className="text-xs text-gray-500">{parent.parentEmail}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500">No parent linked</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-blue-700 font-semibold">
                  {child.totalPoints || 0}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {child.tasksCount || 0}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(child.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm">
                  <button
                    onClick={() => setGameManagerChild({ id: child.id, name: child.name })}
                    className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition text-xs font-medium"
                  >
                    <Gamepad2 className="w-4 h-4" />
                    إدارة الألعاب
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredChildren?.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            No children found matching your search.
          </div>
        )}
      </div>

      {/* Game Manager Dialog */}
      {gameManagerChild && (
        <ChildGameManager
          childId={gameManagerChild.id}
          childName={gameManagerChild.name}
          token={token}
          onClose={() => setGameManagerChild(null)}
        />
      )}
    </div>
  );
}

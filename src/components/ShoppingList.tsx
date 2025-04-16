import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, AlertCircle, Plus, Trash2, Check } from 'lucide-react';
import type { ShoppingList as ShoppingListType, ShoppingItem } from '../types/user';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useUser } from '../context/UserContext';

interface ShoppingListProps {
  list: ShoppingListType;
  onClose: () => void;
  onUpdate: (list: ShoppingListType) => void;
}

function ShoppingList({ list, onClose, onUpdate }: ShoppingListProps) {
  const [items, setItems] = useState<ShoppingItem[]>(list.items);
  const { user, refreshUserData } = useUser();
  const [newItem, setNewItem] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newUnit, setNewUnit] = useState('unidade');
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<'category' | 'name' | 'status'>('category');
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const handleAddItem = async () => {
    if (!newItem.trim()) return;
    
    setIsUpdating(true);
    setError('');

    try {
      const item: ShoppingItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: newItem.trim(),
        quantity: newQuantity || '1',
        unit: newUnit,
        category: 'outros',
        checked: false,
        mealIds: []
      };

      const updatedItems = [...items, item];
      setItems(updatedItems);
      
      // Update in Firestore
      if (user) {
        const updatedList = {
          ...list,
          items: updatedItems,
          updatedAt: new Date().toISOString()
        };
        
        await updateDoc(doc(db, 'users', user.uid), {
          shoppingList: updatedList
        });
        
        // Refresh user data to update UI
        await refreshUserData();
      }

      setNewItem('');
      setNewQuantity('');
      setNewUnit('unidade');
    } catch (err) {
      console.error('Erro ao adicionar item:', err);
      setError('Erro ao adicionar item. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleItem = async (id: string) => {
    if (!user || isUpdating) return;
    
    setIsUpdating(true);
    setError('');
    
    try {
      const updatedItems = items.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      );
      setItems(updatedItems);
      
      // Update in Firestore
      const updatedList = {
        ...list,
        items: updatedItems,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'users', user.uid), {
        shoppingList: updatedList
      });
      
      // Refresh user data to update UI
      await refreshUserData();
    } catch (err) {
      console.error('Erro ao atualizar item:', err);
      setError('Erro ao atualizar item. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveItem = async (id: string) => {
    if (!user || isUpdating) return;
    
    setIsUpdating(true);
    setError('');
    
    try {
      const updatedItems = items.filter(item => item.id !== id);
      setItems(updatedItems);
      
      // Update in Firestore
      const updatedList = {
        ...list,
        items: updatedItems,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'users', user.uid), {
        shoppingList: updatedList
      });
      
      // Refresh user data to update UI
      await refreshUserData();
    } catch (err) {
      console.error('Erro ao remover item:', err);
      setError('Erro ao remover item. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateQuantity = async (id: string, quantity: string) => {
    if (!user || isUpdating) return;
    
    setIsUpdating(true);
    setError('');
    
    try {
      const updatedItems = items.map(item =>
        item.id === id ? { ...item, quantity } : item
      );
      setItems(updatedItems);
      
      // Update in Firestore
      const updatedList = {
        ...list,
        items: updatedItems,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'users', user.uid), {
        shoppingList: updatedList
      });
      
      // Refresh user data to update UI
      await refreshUserData();
    } catch (err) {
      console.error('Erro ao atualizar quantidade:', err);
      setError('Erro ao atualizar quantidade. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter and sort items
  const filteredItems = items.filter(item => {
    if (!filter) return true;
    return (
      item.name.toLowerCase().includes(filter.toLowerCase()) ||
      item.category.toLowerCase().includes(filter.toLowerCase())
    );
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'category':
        return a.category.localeCompare(b.category);
      case 'name':
        return a.name.localeCompare(b.name);
      case 'status':
        return Number(a.checked) - Number(b.checked);
      default:
        return 0;
    }
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl flex items-center justify-center shadow-lg">
                <ShoppingCart className="text-primary-500" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Lista de Compras</h2>
                <p className="text-sm text-gray-500">
                  {list.name || 'Lista Semanal'} ({list.startDate} até {list.endDate})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>

          {/* Error message */}
          {list.description && (
            <div className="mb-4 p-4 bg-blue-50 text-blue-600 rounded-lg flex items-start gap-2">
              <div className="mt-1">ℹ️</div>
              <div>
                <p className="font-medium">Informação</p>
                <p>{list.description}</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-500 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Add Item Form */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                placeholder="Adicionar novo item..."
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
              />
              <button
                onClick={handleAddItem}
                disabled={!newItem.trim()}
                className={`p-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all ${isUpdating || !newItem.trim() ? 'opacity-50 cursor-not-allowed' : 'shadow'}`}
              >
                {isUpdating ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Plus size={24} />
                )}
              </button>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                placeholder="Quantidade"
                className="w-24 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <select
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="unidade">Unidade</option>
                <option value="kg">Quilos</option>
                <option value="g">Gramas</option>
                <option value="ml">Mililitros</option>
                <option value="l">Litros</option>
                <option value="pacote">Pacote</option>
                <option value="caixa">Caixa</option>
              </select>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-6">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-medium mb-3 capitalize">{category}</h3>
              <div className="space-y-2">
                {items.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl shadow-sm transition-all ${
                      item.checked ? 'opacity-50' : ''
                    }`}
                  >
                    <button
                      onClick={() => handleToggleItem(item.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        item.checked
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {item.checked && <Check size={14} className="text-white" />}
                    </button>
                    <div className="flex-1">
                      <p className={`font-medium ${item.checked ? 'line-through text-gray-400' : ''}`}>
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.quantity || '1'}
                          onChange={(e) => handleUpdateQuantity(item.id, e.target.value)}
                          className="w-16 px-2 py-1 text-sm bg-transparent border-b border-gray-300 focus:outline-none focus:border-primary-500"
                        />
                        <span className="text-sm text-gray-500">{item.unit || 'unidade'}</span>
                        {item.notes && (
                          <span className="text-xs text-gray-400 ml-2">({item.notes})</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center py-8">
              <ShoppingCart size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Sua lista de compras semanal está vazia</p>
              <p className="text-sm text-gray-400">
                Adicione itens usando o campo acima
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShoppingList;
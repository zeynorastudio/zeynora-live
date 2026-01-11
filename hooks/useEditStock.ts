import { useState } from "react";

export type EditStockState = {
  isOpen: boolean;
  productUid: string | null;
  sku: string | null;
  color: string | null;
  size: string | null;
  currentStock: number;
};

const initialState: EditStockState = {
  isOpen: false,
  productUid: null,
  sku: null,
  color: null,
  size: null,
  currentStock: 0,
};

export function useEditStock() {
  const [modalState, setModalState] = useState<EditStockState>(initialState);

  const openModal = (productUid: string, sku: string, color: string, size: string, currentStock: number) => {
    setModalState({
      isOpen: true,
      productUid,
      sku,
      color,
      size,
      currentStock,
    });
  };

  const closeModal = () => {
    setModalState(initialState);
  };

  return {
    modalState,
    openModal,
    closeModal,
  };
}




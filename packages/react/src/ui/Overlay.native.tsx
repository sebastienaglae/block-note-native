/** Native overlay: a transparent Modal with a tap-to-close backdrop. */
import { Modal, Pressable, View } from "react-native";
import type { ReactNode } from "react";

export interface OverlayProps {
  onClose: () => void;
  top: number;
  left: number;
  children: ReactNode;
}

export function Overlay({ onClose, top, left, children }: OverlayProps): JSX.Element {
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <View style={{ position: "absolute", top, left }}>{children}</View>
    </Modal>
  );
}

"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { DashButton } from "@/components/dash/dash-button";
import { ListFormDialog } from "./list-form-dialog";

/** A small "New list" pill that opens the list form (used on the Tasks overview). */
export function NewListButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <DashButton variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus /> New list
      </DashButton>
      <ListFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

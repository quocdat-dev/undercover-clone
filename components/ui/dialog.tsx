'use client'

import * as React from "react"
import { Modal, useOverlayState } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface DialogProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const DialogContext = React.createContext<{
  hasModal: boolean
} | undefined>(undefined)

export function Dialog({ open, defaultOpen, onOpenChange, children }: DialogProps) {
  const state = useOverlayState({
    isOpen: open,
    defaultOpen,
    onOpenChange,
  })

  return (
    <DialogContext.Provider value={{ hasModal: true }}>
      <Modal state={state}>{children}</Modal>
    </DialogContext.Provider>
  )
}

export function DialogTrigger({
  children,
  asChild,
  ...props
}: {
  children: React.ReactNode
  asChild?: boolean
} & React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(DialogContext)
  if (!context) return null

  if (asChild) {
    return <Modal.Trigger {...props}>{children}</Modal.Trigger>
  }

  return (
    <Modal.Trigger {...props}>
      <button type="button">{children}</button>
    </Modal.Trigger>
  )
}

type ModalDialogProps = React.ComponentPropsWithoutRef<typeof Modal.Dialog>
type ModalCloseTriggerProps = React.ComponentPropsWithoutRef<typeof Modal.CloseTrigger>
type DialogContentProps = Omit<ModalDialogProps, "children"> & { children: React.ReactNode }

export function DialogContent({
  children,
  className,
  ...props
}: DialogContentProps) {
  const context = React.useContext(DialogContext)
  if (!context) return null

  // Separate header, footer, and body content
  const childrenArray = React.Children.toArray(children)
  const header = childrenArray.find(
    (child: any) => React.isValidElement(child) && child.type === DialogHeader
  )
  const footer = childrenArray.find(
    (child: any) => React.isValidElement(child) && child.type === DialogFooter
  )
  const bodyContent = childrenArray.filter(
    (child: any) =>
      !(React.isValidElement(child) && (child.type === DialogHeader || child.type === DialogFooter))
  )

  const renderSection = (section: React.ReactNode) =>
    React.isValidElement(section)
      ? React.Children.toArray((section.props as { children?: React.ReactNode }).children)
      : section

  return (
    <Modal.Backdrop>
      <Modal.Container>
        <Modal.Dialog
          {...props}
          className={cn("bg-background text-foreground rounded-sm border border-border shadow-md p-6", className)}
        >
          {header && (
            <Modal.Header className="mb-4">
              {renderSection(header)}
            </Modal.Header>
          )}
          <Modal.Body className="mb-4">{bodyContent}</Modal.Body>
          {footer && (
            <Modal.Footer className="mt-4">
              {renderSection(footer)}
            </Modal.Footer>
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
  )
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
  )
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-4", className)} {...props} />
  )
}

export function DialogClose({ children, ...props }: ModalCloseTriggerProps) {
  const context = React.useContext(DialogContext)
  if (!context) return null

  return (
    <Modal.CloseTrigger {...props}>
      {children}
    </Modal.CloseTrigger>
  )
}

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner } from "sonner";

// Тема — з провайдера самого додатка. Тут колись стояв next-themes, якого в
// проєкті немає: хук повертав "system", і при ручному перемиканні теми
// сповіщення лишалися в кольорі операційної системи.
import { useTheme } from "@/lib/theme"

const Toaster = ({
  ...props
}) => {
  const { resolved } = useTheme()

  return (
    <Sonner
      theme={resolved}
      // По центру вгорі: праворуч на телефоні сповіщення налазило на кнопку
      // профілю, а до жесту «змахнути» треба було цілитися в край екрана.
      position="top-center"
      // Нижче шапки, а не поверх неї.
      offset={{ top: "4.5rem" }}
      mobileOffset={{ top: "calc(4.5rem + env(safe-area-inset-top, 0px))", left: "0.75rem", right: "0.75rem" }}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)"
        }
      }
      {...props} />
  );
}

export { Toaster }

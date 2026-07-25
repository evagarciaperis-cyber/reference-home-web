import type { Metadata } from "next";
import { NotFound } from "@/ui/pages/NotFound";
import { Footer } from "@/ui/layout/Footer";

// Puerto literal de web-nueva/404.html: mismo title y robots noindex.
export const metadata: Metadata = {
  title: "Página no encontrada — Reference Study",
};

export default function NotFoundPage() {
  return (
    <>
      <NotFound />
      <Footer />
    </>
  );
}

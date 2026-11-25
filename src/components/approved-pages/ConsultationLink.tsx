import { FREE_CONSULTATION_URL } from "@/lib/approved-pages/consultation";

export default function ConsultationLink({ className }: { className: string }) {
  return <a href={FREE_CONSULTATION_URL} className={className} data-consultation-link>Book a free consultation</a>;
}

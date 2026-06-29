import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import DashboardScreen    from "@/screens/DashboardScreen";
import CalendarScreen     from "@/screens/CalendarScreen";
import AppointmentsScreen from "@/screens/AppointmentsScreen";
import ClientsScreen      from "@/screens/ClientsScreen";
import ServicesScreen     from "@/screens/ServicesScreen";
import TeamScreen         from "@/screens/TeamScreen";
import NotFoundScreen     from "@/screens/NotFoundScreen";
import LoginScreen        from "@/screens/LoginScreen";

export default function App() {
  return (
    <>
    <Toaster position="top-right" richColors closeButton />
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/" element={<RequireAuth><DashboardScreen /></RequireAuth>} />
      <Route path="/calendar" element={<RequireAuth><CalendarScreen /></RequireAuth>} />
      <Route path="/appointments" element={<RequireAuth><AppointmentsScreen /></RequireAuth>} />
      <Route path="/clients" element={<RequireAuth><ClientsScreen /></RequireAuth>} />
      <Route path="/services" element={<RequireAuth><ServicesScreen /></RequireAuth>} />
      <Route path="/team" element={<RequireAuth><TeamScreen /></RequireAuth>} />
      <Route path="*" element={<NotFoundScreen />} />
    </Routes>
    </>
  );
}

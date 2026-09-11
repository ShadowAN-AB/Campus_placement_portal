import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Shell } from "./components/Shell";
import { AuthPage } from "./pages/AuthPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { StudentDashboard } from "./pages/StudentDashboard";
import { RecruiterDashboard } from "./pages/RecruiterDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";
import { JobDetailPage } from "./pages/JobDetailPage";
import { ResumeIntelligence } from "./pages/ResumeIntelligence";
import { InterviewsPage } from "./pages/InterviewsPage";

function Guard({ role }: { role?: "student" | "recruiter" | "admin" }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="p-10 text-sm text-zinc-500">Loading…</p>;
  if (!user) return <Navigate to="/auth" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}

function Home() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role === "recruiter") return <Navigate to="/dashboard/recruiter" replace />;
  if (user.role === "admin") return <Navigate to="/dashboard/admin" replace />;
  return <Navigate to="/dashboard/student" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/" element={<Home />} />
        <Route element={<Guard role="student" />}>
          <Route path="/dashboard/student" element={<StudentDashboard />} />
          <Route path="/resume-intelligence" element={<ResumeIntelligence />} />
        </Route>
        <Route element={<Guard role="recruiter" />}>
          <Route path="/dashboard/recruiter" element={<RecruiterDashboard />} />
        </Route>
        <Route element={<Guard role="admin" />}>
          <Route path="/dashboard/admin" element={<AdminDashboard />} />
        </Route>
        <Route element={<Guard />}>
          <Route path="/jobs/:jobId" element={<JobDetailPage />} />
          <Route path="/interviews" element={<InterviewsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

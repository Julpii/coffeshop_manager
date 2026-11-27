import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Shell from './components/Shell.jsx';
import { Spinner } from './components/ui.jsx';
import Login from './pages/Login.jsx';
import Pos from './pages/Pos.jsx';
import CashierOrders from './pages/CashierOrders.jsx';
import AdminOrders from './pages/AdminOrders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import History from './pages/History.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import ProductForm from './pages/ProductForm.jsx';
import Categories from './pages/Categories.jsx';
import CategoryForm from './pages/CategoryForm.jsx';

const home = (role) => (role === 'admin' ? '/dashboard' : '/pos');

function Protected({ roles, children }) {
  const { user } = useAuth();
  if (!roles.includes(user.role)) return <Navigate to={home(user.role)} replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid h-screen place-items-center"><Spinner /></div>;
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const admin = ['admin'];
  const cashier = ['cashier'];
  const both = ['admin', 'cashier'];
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/pos" element={<Protected roles={cashier}><Pos /></Protected>} />
        <Route path="/orders" element={<Protected roles={both}>{user.role === 'admin' ? <AdminOrders /> : <CashierOrders />}</Protected>} />
        <Route path="/orders/:id" element={<Protected roles={both}><OrderDetail /></Protected>} />
        <Route path="/history" element={<Protected roles={both}><History /></Protected>} />
        <Route path="/dashboard" element={<Protected roles={admin}><Dashboard /></Protected>} />
        <Route path="/products" element={<Protected roles={admin}><Products /></Protected>} />
        <Route path="/products/new" element={<Protected roles={admin}><ProductForm /></Protected>} />
        <Route path="/products/:id/edit" element={<Protected roles={admin}><ProductForm /></Protected>} />
        <Route path="/categories" element={<Protected roles={admin}><Categories /></Protected>} />
        <Route path="/categories/new" element={<Protected roles={admin}><CategoryForm /></Protected>} />
        <Route path="/categories/:id/edit" element={<Protected roles={admin}><CategoryForm /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to={home(user.role)} replace />} />
    </Routes>
  );
}

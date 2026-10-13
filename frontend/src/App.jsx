import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Users from './pages/Users.jsx';
import UserForm from './pages/UserForm.jsx';
import Clients from './pages/Clients.jsx';
import ClientForm from './pages/ClientForm.jsx';
import ClientDetail from './pages/ClientDetail.jsx';
import Profile from './pages/Profile.jsx';
import NotFound from './pages/NotFound.jsx';
import MembershipTypes from './pages/MembershipTypes.jsx';
import MembershipTypeForm from './pages/MembershipTypeForm.jsx';
import MembershipForm from './pages/MembershipForm.jsx';
import PaymentForm from './pages/PaymentForm.jsx';
import FaceRegister from './pages/FaceRegister.jsx';
import AccessStation from './pages/AccessStation.jsx';

const ADMIN = ['administrador'];
const CLIENT_WRITERS = ['administrador', 'recepcionista'];
const CLIENT_READERS = ['administrador', 'recepcionista', 'entrenador'];
const FRONT_DESK = ['administrador', 'recepcionista'];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        {/* La estación ocupa toda la pantalla, fuera del menú (FR-037) */}
        <Route element={<ProtectedRoute roles={FRONT_DESK} />}>
          <Route path="access/station" element={<AccessStation />} />
        </Route>

        <Route element={<Layout />}>
          <Route index element={<Home />} />

          <Route element={<ProtectedRoute roles={ADMIN} />}>
            <Route path="users" element={<Users />} />
            <Route path="users/new" element={<UserForm />} />
            <Route path="users/:id" element={<UserForm />} />
          </Route>

          <Route element={<ProtectedRoute roles={CLIENT_WRITERS} />}>
            <Route path="clients/new" element={<ClientForm />} />
            <Route path="clients/:id/edit" element={<ClientForm />} />
          </Route>

          <Route element={<ProtectedRoute roles={CLIENT_READERS} />}>
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetail />} />
          </Route>

          <Route element={<ProtectedRoute roles={ADMIN} />}>
            <Route path="membership-types/new" element={<MembershipTypeForm />} />
            <Route path="membership-types/:id" element={<MembershipTypeForm />} />
          </Route>

          <Route element={<ProtectedRoute roles={FRONT_DESK} />}>
            <Route path="membership-types" element={<MembershipTypes />} />
            <Route path="clients/:id/memberships/new" element={<MembershipForm />} />
            <Route path="clients/:id/payments/new" element={<PaymentForm />} />
            <Route path="clients/:id/face" element={<FaceRegister />} />
          </Route>

          <Route element={<ProtectedRoute roles={['cliente']} />}>
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}

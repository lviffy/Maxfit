import { createBrowserRouter } from 'react-router';
import Landing from './pages/Landing';
import RoleSelection from './pages/RoleSelection';
import MemberRegister from './pages/MemberRegister';
import EmployeeRegister from './pages/EmployeeRegister';
import Login from './pages/Login';
import MemberDashboard from './pages/MemberDashboard';
import AdminMembers from './pages/AdminMembers';
import AdminAddMember from './pages/AdminAddMember';
import AdminMemberProfile from './pages/AdminMemberProfile';
import Subscriptions from './pages/Subscriptions';
import SubscriptionMemberProfile from './pages/SubscriptionMemberProfile';
import AdminEmployees from './pages/AdminEmployees';
import TrainerPanel from './pages/TrainerPanel';
import Payments from './pages/Payments';
import Workouts from './pages/Workouts';
import Attendance from './pages/Attendance';
import Progress from './pages/Progress';
import Schedule from './pages/Schedule';
import Badges from './pages/Badges';
import Owner from './pages/Owner';
import Budget from './pages/Budget';
import Announcements from './pages/Announcements';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Landing,
  },
  {
    path: '/register',
    Component: RoleSelection,
  },
  {
    path: '/register/member',
    Component: MemberRegister,
  },
  {
    path: '/register/employee',
    Component: EmployeeRegister,
  },
  {
    path: '/login',
    Component: Login,
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute allowedRoles={['member']}><MemberDashboard /></ProtectedRoute>,
  },
  {
    path: '/members',
    element: <ProtectedRoute allowedRoles={['admin', 'owner']}><AdminMembers /></ProtectedRoute>,
  },
  {
    path: '/members/add',
    element: <ProtectedRoute allowedRoles={['admin', 'owner']}><AdminAddMember /></ProtectedRoute>,
  },
  {
    path: '/members/:memberId',
    element: <ProtectedRoute allowedRoles={['admin', 'owner']}><AdminMemberProfile /></ProtectedRoute>,
  },
  {
    path: '/subscriptions',
    element: <ProtectedRoute allowedRoles={['admin', 'owner']}><Subscriptions /></ProtectedRoute>,
  },
  {
    path: '/subscriptions/:memberId',
    element: <ProtectedRoute allowedRoles={['admin', 'owner']}><SubscriptionMemberProfile /></ProtectedRoute>,
  },
  {
    path: '/employees',
    element: <ProtectedRoute allowedRoles={['owner']}><AdminEmployees /></ProtectedRoute>,
  },
  {
    path: '/trainer',
    element: <ProtectedRoute allowedRoles={['trainer']}><TrainerPanel /></ProtectedRoute>,
  },
  {
    path: '/payments',
    element: <ProtectedRoute allowedRoles={['member']}><Payments /></ProtectedRoute>,
  },
  {
    path: '/workouts',
    element: <ProtectedRoute allowedRoles={['member']}><Workouts /></ProtectedRoute>,
  },
  {
    path: '/attendance',
    element: <ProtectedRoute allowedRoles={['member', 'trainer', 'admin', 'owner']}><Attendance /></ProtectedRoute>,
  },
  {
    path: '/progress',
    element: <ProtectedRoute allowedRoles={['member']}><Progress /></ProtectedRoute>,
  },
  {
    path: '/schedule',
    element: <ProtectedRoute allowedRoles={['member', 'trainer']}><Schedule /></ProtectedRoute>,
  },
  {
    path: '/badges',
    element: <ProtectedRoute allowedRoles={['member']}><Badges /></ProtectedRoute>,
  },
  {
    path: '/budget',
    element: <ProtectedRoute allowedRoles={['admin', 'owner']}><Budget /></ProtectedRoute>,
  },
  {
    path: '/announcements',
    element: <ProtectedRoute allowedRoles={['member', 'trainer', 'admin', 'owner']}><Announcements /></ProtectedRoute>,
  },
  {
    path: '/owner',
    element: <ProtectedRoute allowedRoles={['owner']}><Owner /></ProtectedRoute>,
  },
  {
    path: '*',
    Component: NotFound,
  },
]);

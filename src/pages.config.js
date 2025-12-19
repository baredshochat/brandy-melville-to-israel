import Home from './pages/Home';
import Orders from './pages/Orders';
import TrackOrder from './pages/TrackOrder';
import PricingLabelsSettings from './pages/PricingLabelsSettings';
import Terms from './pages/Terms';
import StatusSettings from './pages/StatusSettings';
import Chat from './pages/Chat';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import MyOrders from './pages/MyOrders';
import DefectClaim from './pages/DefectClaim';
import Referral from './pages/Referral';
import LocalStock from './pages/LocalStock';
import ManageLocalStock from './pages/ManageLocalStock';
import LocalStockItemDetail from './pages/LocalStockItemDetail';
import ManageCoupons from './pages/ManageCoupons';
import ReturnsPolicy from './pages/ReturnsPolicy';
import ChatLogs from './pages/ChatLogs';
import ProfitReports from './pages/ProfitReports';
import CompletePayment from './pages/CompletePayment';
import BackInStockNotifications from './pages/BackInStockNotifications';
import LoyaltyClub from './pages/LoyaltyClub';
import LoyaltyAdmin from './pages/LoyaltyAdmin';
import ManageCouponTemplates from './pages/ManageCouponTemplates';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Orders": Orders,
    "TrackOrder": TrackOrder,
    "PricingLabelsSettings": PricingLabelsSettings,
    "Terms": Terms,
    "StatusSettings": StatusSettings,
    "Chat": Chat,
    "Reports": Reports,
    "Profile": Profile,
    "MyOrders": MyOrders,
    "DefectClaim": DefectClaim,
    "Referral": Referral,
    "LocalStock": LocalStock,
    "ManageLocalStock": ManageLocalStock,
    "LocalStockItemDetail": LocalStockItemDetail,
    "ManageCoupons": ManageCoupons,
    "ReturnsPolicy": ReturnsPolicy,
    "ChatLogs": ChatLogs,
    "ProfitReports": ProfitReports,
    "CompletePayment": CompletePayment,
    "BackInStockNotifications": BackInStockNotifications,
    "LoyaltyClub": LoyaltyClub,
    "LoyaltyAdmin": LoyaltyAdmin,
    "ManageCouponTemplates": ManageCouponTemplates,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
import BackInStockNotifications from './pages/BackInStockNotifications';
import Chat from './pages/Chat';
import ChatLogs from './pages/ChatLogs';
import CompletePayment from './pages/CompletePayment';
import DefectClaim from './pages/DefectClaim';
import Home from './pages/Home';
import LocalStock from './pages/LocalStock';
import LocalStockItemDetail from './pages/LocalStockItemDetail';
import LoyaltyAdmin from './pages/LoyaltyAdmin';
import LoyaltyClub from './pages/LoyaltyClub';
import ManageCouponTemplates from './pages/ManageCouponTemplates';
import ManageCoupons from './pages/ManageCoupons';
import ManageLocalStock from './pages/ManageLocalStock';
import MyOrders from './pages/MyOrders';
import Orders from './pages/Orders';
import PricingLabelsSettings from './pages/PricingLabelsSettings';
import Profile from './pages/Profile';
import ProfitReports from './pages/ProfitReports';
import Referral from './pages/Referral';
import Reports from './pages/Reports';
import ReturnsPolicy from './pages/ReturnsPolicy';
import StatusSettings from './pages/StatusSettings';
import Terms from './pages/Terms';
import TrackOrder from './pages/TrackOrder';
import __Layout from './Layout.jsx';


export const PAGES = {
    "BackInStockNotifications": BackInStockNotifications,
    "Chat": Chat,
    "ChatLogs": ChatLogs,
    "CompletePayment": CompletePayment,
    "DefectClaim": DefectClaim,
    "Home": Home,
    "LocalStock": LocalStock,
    "LocalStockItemDetail": LocalStockItemDetail,
    "LoyaltyAdmin": LoyaltyAdmin,
    "LoyaltyClub": LoyaltyClub,
    "ManageCouponTemplates": ManageCouponTemplates,
    "ManageCoupons": ManageCoupons,
    "ManageLocalStock": ManageLocalStock,
    "MyOrders": MyOrders,
    "Orders": Orders,
    "PricingLabelsSettings": PricingLabelsSettings,
    "Profile": Profile,
    "ProfitReports": ProfitReports,
    "Referral": Referral,
    "Reports": Reports,
    "ReturnsPolicy": ReturnsPolicy,
    "StatusSettings": StatusSettings,
    "Terms": Terms,
    "TrackOrder": TrackOrder,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
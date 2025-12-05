import Home from './pages/Home';
import Orders from './pages/Orders';
import TrackOrder from './pages/TrackOrder';
import PricingLabelsSettings from './pages/PricingLabelsSettings';
import Terms from './pages/Terms';
import CalculationSettings from './pages/CalculationSettings';
import StatusSettings from './pages/StatusSettings';
import Chat from './pages/Chat';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import MyOrders from './pages/MyOrders';
import DefectClaim from './pages/DefectClaim';
import Referral from './pages/Referral';
import DisplaySettings from './pages/DisplaySettings';
import LocalStock from './pages/LocalStock';
import ManageLocalStock from './pages/ManageLocalStock';
import LocalStockItemDetail from './pages/LocalStockItemDetail';
import ExchangeRates from './pages/ExchangeRates';
import ManageCoupons from './pages/ManageCoupons';
import ReturnsPolicy from './pages/ReturnsPolicy';
import ChatLogs from './pages/ChatLogs';
import ProfitReports from './pages/ProfitReports';
import CompletePayment from './pages/CompletePayment';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Orders": Orders,
    "TrackOrder": TrackOrder,
    "PricingLabelsSettings": PricingLabelsSettings,
    "Terms": Terms,
    "CalculationSettings": CalculationSettings,
    "StatusSettings": StatusSettings,
    "Chat": Chat,
    "Reports": Reports,
    "Profile": Profile,
    "MyOrders": MyOrders,
    "DefectClaim": DefectClaim,
    "Referral": Referral,
    "DisplaySettings": DisplaySettings,
    "LocalStock": LocalStock,
    "ManageLocalStock": ManageLocalStock,
    "LocalStockItemDetail": LocalStockItemDetail,
    "ExchangeRates": ExchangeRates,
    "ManageCoupons": ManageCoupons,
    "ReturnsPolicy": ReturnsPolicy,
    "ChatLogs": ChatLogs,
    "ProfitReports": ProfitReports,
    "CompletePayment": CompletePayment,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
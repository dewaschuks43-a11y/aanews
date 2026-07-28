import { Router, Switch, Route } from "wouter";
import Home from "./pages/Home";
import Article from "./pages/Article";
import CategoryPage from "./pages/Category";
import AdminPage from "./pages/Admin";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function App() {
  return (
    <Router base={base}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/article/:slug" component={Article} />
        <Route path="/category/:category" component={CategoryPage} />
        <Route path="/admin" component={AdminPage} />
        <Route>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-black text-gray-900 mb-2">404</h1>
              <p className="text-gray-500">Page not found</p>
              <a href={base || "/"} className="text-[#CC0000] font-bold mt-4 block hover:underline">← Back to Home</a>
            </div>
          </div>
        </Route>
      </Switch>
    </Router>
  );
}

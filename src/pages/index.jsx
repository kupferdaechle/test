import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import NewProcess from "./NewProcess";

import ProcessDetails from "./ProcessDetails";

import Consultants from "./Consultants";

import Settings from "./Settings";

import InternalAI from "./InternalAI";

import Kundenstamm from "./Kundenstamm";

import Projects from "./Projects";

import ProjectDetails from "./ProjectDetails";

import HSxBExperts from "./HSxBExperts";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    NewProcess: NewProcess,
    
    ProcessDetails: ProcessDetails,
    
    Consultants: Consultants,
    
    Settings: Settings,
    
    InternalAI: InternalAI,
    
    Kundenstamm: Kundenstamm,
    
    Projects: Projects,
    
    ProjectDetails: ProjectDetails,
    
    HSxBExperts: HSxBExperts,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/NewProcess" element={<NewProcess />} />
                
                <Route path="/ProcessDetails" element={<ProcessDetails />} />
                
                <Route path="/Consultants" element={<Consultants />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/InternalAI" element={<InternalAI />} />
                
                <Route path="/Kundenstamm" element={<Kundenstamm />} />
                
                <Route path="/Projects" element={<Projects />} />
                
                <Route path="/ProjectDetails" element={<ProjectDetails />} />
                
                <Route path="/HSxBExperts" element={<HSxBExperts />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
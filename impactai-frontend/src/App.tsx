import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RootLayout } from './components/RootLayout';
import { ProjectLayout } from './components/ProjectLayout';
import { ProjectsListPage } from './pages/ProjectsListPage';
import { ProjectOverviewPage } from './pages/ProjectOverviewPage';
import { ProjectMediaPage } from './pages/ProjectMediaPage';
import { ProjectMapPage } from './pages/ProjectMapPage';
import { ProjectTimelinePage } from './pages/ProjectTimelinePage';
import { ProjectSearchPage } from './pages/ProjectSearchPage';
import { ProjectComparePage } from './pages/ProjectComparePage';
import { ProjectReportsPage } from './pages/ProjectReportsPage';
import { ReportDetailPage } from './pages/ReportDetailPage';
import { MediaDetailPage } from './pages/MediaDetailPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<ProjectsListPage />} />
          <Route path="/media/:mediaId" element={<MediaDetailPage />} />
          <Route path="/projects/:projectId" element={<ProjectLayout />}>
            <Route index element={<ProjectOverviewPage />} />
            <Route path="media" element={<ProjectMediaPage />} />
            <Route path="map" element={<ProjectMapPage />} />
            <Route path="timeline" element={<ProjectTimelinePage />} />
            <Route path="search" element={<ProjectSearchPage />} />
            <Route path="compare" element={<ProjectComparePage />} />
            <Route path="reports" element={<ProjectReportsPage />} />
            <Route path="reports/:reportId" element={<ReportDetailPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}


export default App;

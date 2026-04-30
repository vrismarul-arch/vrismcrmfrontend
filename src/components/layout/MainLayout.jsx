// MainLayout.jsx
import { Layout, Drawer } from 'antd';
import { useState, useCallback, useEffect } from 'react';
import { MenuOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import FooterComponent from './FooterComponent';
import './layout.css';

const { Content, Header, Footer } = Layout;

const MainLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Check screen size on mount and resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Close mobile drawer when resizing to desktop
      if (!mobile && mobileDrawerOpen) {
        setMobileDrawerOpen(false);
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [mobileDrawerOpen]);

  const handleCollapse = useCallback((isCollapsed) => {
    setCollapsed(isCollapsed);
  }, []);

  const toggleMobileDrawer = useCallback(() => {
    setMobileDrawerOpen(prev => !prev);
  }, []);

  const closeMobileDrawer = useCallback(() => {
    setMobileDrawerOpen(false);
  }, []);

  return (
    <>
      <Layout className="main-layout" style={{ minHeight: '100vh' }}>
        {/* Desktop Sidebar - Only show on desktop */}
        {!isMobile && (
          <Layout.Sider
            collapsible
            collapsed={collapsed}
            onCollapse={handleCollapse}
            breakpoint="lg"
            collapsedWidth="80"
            className="desktop-sidebar"
            theme="light"
            width={220}
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              height: '100vh',
              zIndex: 100,
            }}
          >
            <Sidebar collapsed={collapsed} />
          </Layout.Sider>
        )}

        <Layout 
          className="main-layout-content"
          style={!isMobile ? { marginLeft: collapsed ? 80 : 220, transition: 'all 0.3s' } : {}}
        >
          {/* TopNavbar always visible - pass isMobile prop and toggle function */}
          <Header className="top-navbar" style={{ 
            position: 'sticky', 
            top: 0, 
            zIndex: 99,
            width: '100%',
            padding: 0,
            background: '#fff',
          }}>
            <TopNavbar 
              collapsed={collapsed} 
              setCollapsed={setCollapsed}
              isMobile={isMobile}
              onMenuClick={toggleMobileDrawer}
            />
          </Header>

          <Content className="main-content" style={{ 
            padding: '24px',
            minHeight: 'calc(100vh - 64px)',
          }}>
            <div className="inner-content">{children}</div>
          </Content>

          <FooterComponent />
        </Layout>
      </Layout>

      {/* Mobile Drawer Sidebar */}
      <Drawer
        placement="left"
        closable={true}
        onClose={closeMobileDrawer}
        open={mobileDrawerOpen}
        width={250}
        styles={{ body: { padding: 0 } }}
        className="mobile-drawer"
      >
        <Sidebar collapsed={false} onMobileClose={closeMobileDrawer} />
      </Drawer>
    </>
  );
};

export default MainLayout;
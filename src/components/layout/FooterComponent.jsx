// FooterComponent.jsx
import React from 'react';
import { Layout } from 'antd';
import './Footer.css';
const { Footer } = Layout;

const FooterComponent = () => {
  return (
    <Footer
      style={{
        textAlign: 'center',
        backgroundColor: '#132f45',
        padding: '16px 50px',
        position: 'relative',
        bottom: 0,
        width: '100%',
        borderTop: '1px solid #e8e8e8',
        fontSize: '14px',
        color: '#ffffffff',
      }}
    >
      © {new Date().getFullYear()} All rights are reserved by <strong> <a href="https://vrism.in/" target="_blank" rel="noopener noreferrer"><span className='company-name'>Vrism</span></a></strong> 


    </Footer>
  );
};

export default FooterComponent;

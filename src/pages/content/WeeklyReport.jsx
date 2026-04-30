import React, { useState, useEffect } from 'react';
import {
  Table, Button, Select, message, Popconfirm, Drawer,
  Form, Input, Row, Col, Typography, Spin, InputNumber,
  DatePicker, Tabs, Progress, Radio, Space
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  SearchOutlined, SaveOutlined, CloseOutlined, CheckCircleOutlined,
  ClockCircleOutlined, WarningOutlined, ReloadOutlined, CalendarOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api/axios';
import './WeeklyReportManager.css';

const { Title, Text } = Typography;

/* ─── constants ─────────────────────────────────────────────── */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
const WEEK_NOS = [1, 2, 3, 4, 5];

/* ─── helpers ───────────────────────────────────────────────── */
const calcWeekDist = (s, r, n = 5) =>
  WEEK_NOS.map((wn, i) => ({
    weekNumber: wn,
    staticTarget: Math.floor(s / n) + (i < s % n ? 1 : 0),
    reelsTarget: Math.floor(r / n) + (i < r % n ? 1 : 0),
    posts: [], weekStartDate: null, weekEndDate: null,
  }));

const weekProgress = (w) => {
  const t = (w.staticTarget || 0) + (w.reelsTarget || 0);
  const d = (w.posts?.filter(p => p.type === 'static').length || 0) +
    (w.posts?.filter(p => p.type === 'reel').length || 0);
  return t > 0 ? Math.min((d / t) * 100, 100) : 0;
};

const calcTotals = (ws) => {
  let ts = 0, tr = 0, tsc = 0, trc = 0;
  ws.forEach(w => {
    ts  += w.staticTarget || 0;
    tr  += w.reelsTarget  || 0;
    tsc += w.posts?.filter(p => p.type === 'static').length || 0;
    trc += w.posts?.filter(p => p.type === 'reel').length   || 0;
  });
  return {
    totalStatic: ts, totalReels: tr,
    totalStaticCompleted: tsc, totalReelsCompleted: trc,
    staticProgress:  ts > 0 ? (tsc / ts) * 100 : 0,
    reelsProgress:   tr > 0 ? (trc / tr) * 100 : 0,
    overallProgress: (ts + tr) > 0 ? ((tsc + trc) / (ts + tr)) * 100 : 0,
    totalTarget: ts + tr, totalCompleted: tsc + trc,
  };
};

/* ─── component ─────────────────────────────────────────────── */
const WeeklyReportManager = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [businessAccounts, setBusinessAccounts] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  const [isFormDrawerVisible, setIsFormDrawerVisible] = useState(false);
  const [isViewDrawerVisible, setIsViewDrawerVisible] = useState(false);
  const [isPostDrawerVisible, setIsPostDrawerVisible] = useState(false);
  const [drawerMode, setDrawerMode] = useState('create');

  const [form] = Form.useForm();
  const [postForm] = Form.useForm();

  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [editingPost, setEditingPost] = useState(null);

  const [mStatic, setMStatic] = useState(0);
  const [mReels, setMReels] = useState(0);
  const [distType, setDistType] = useState('equal');

  const [totals, setTotals] = useState(calcTotals([]));

  const [filters, setFilters] = useState({ businessAccount: '', month: '', year: '' });

  /* ── effects ── */
  useEffect(() => { setTotals(calcTotals(weeks)); }, [weeks]);

  useEffect(() => {
    if (distType !== 'equal') return;
    setWeeks(prev =>
      calcWeekDist(mStatic, mReels).map((nw, i) => ({
        ...nw,
        posts: prev[i]?.posts || [],
        weekStartDate: prev[i]?.weekStartDate || null,
        weekEndDate:   prev[i]?.weekEndDate   || null,
      }))
    );
  }, [mStatic, mReels, distType]);

  /* ── api ── */
  const fetchAccounts = async () => {
    try {
      const r = await api.get('/api/accounts');
      setBusinessAccounts(r.data.data || r.data || []);
    } catch { message.error('Failed to load accounts'); }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.businessAccount) params.businessAccount = filters.businessAccount;
      if (filters.month)           params.month           = filters.month;
      if (filters.year)            params.year            = filters.year;
      const r = await api.get('/api/reports', { params });
      setReports(r.data.data || []);
    } catch { message.error('Failed to load reports'); setReports([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAccounts(); fetchReports(); }, []);
  useEffect(() => { fetchReports(); }, [filters.businessAccount, filters.month, filters.year]);

  const deleteReport = async (id) => {
    try { await api.delete(`/api/reports/${id}`); message.success('Report deleted'); fetchReports(); }
    catch { message.error('Failed to delete'); }
  };

  /* ── open drawers ── */
  const handleCreate = () => {
    setDrawerMode('create'); setSelectedReport(null); form.resetFields();
    setMStatic(0); setMReels(0); setDistType('equal');
    setWeeks(WEEK_NOS.map(wn => ({ weekNumber: wn, staticTarget: 0, reelsTarget: 0, posts: [], weekStartDate: null, weekEndDate: null })));
    setIsFormDrawerVisible(true);
  };

  const handleEdit = (rep) => {
    setDrawerMode('edit'); setSelectedReport(rep);
    form.setFieldsValue({ businessAccount: rep.businessAccount?._id || rep.businessAccount, month: rep.month, year: rep.year });
    const ws = WEEK_NOS.map(wn =>
      rep.weeks?.find(w => w.weekNumber === wn) ||
      { weekNumber: wn, staticTarget: 0, reelsTarget: 0, posts: [], weekStartDate: null, weekEndDate: null }
    );
    setMStatic(ws.reduce((s, w) => s + (w.staticTarget || 0), 0));
    setMReels(ws.reduce((s, w) => s + (w.reelsTarget  || 0), 0));
    setDistType('manual');
    setWeeks(ws);
    setIsFormDrawerVisible(true);
  };

  /* ── week / post handlers ── */
  const handleWeekUpdate = (wn, field, val) =>
    setWeeks(prev => prev.map(w => w.weekNumber === wn ? { ...w, [field]: val } : w));

  const handleAddPost = (wn) => {
    setSelectedWeek(wn); setEditingPost(null); postForm.resetFields(); setIsPostDrawerVisible(true);
  };

  const handleEditPost = (wn, idx, post) => {
    setSelectedWeek(wn);
    setEditingPost({ index: idx, data: post });
    postForm.setFieldsValue({ ...post, postedDate: post.postedDate ? dayjs(post.postedDate) : null });
    setIsPostDrawerVisible(true);
  };

  const handleDeletePost = (wn, idx) => {
    setWeeks(prev => prev.map(w =>
      w.weekNumber === wn ? { ...w, posts: w.posts.filter((_, i) => i !== idx) } : w
    ));
    message.success('Post removed');
  };

  const handleSavePost = () => {
    postForm.validateFields().then(v => {
      const post = {
        title: v.title, instagramLink: v.instagramLink || '',
        postedDate: v.postedDate ? v.postedDate.toDate() : new Date(),
        notes: v.notes || '', type: v.type || 'static',
      };
      setWeeks(prev => prev.map(w => {
        if (w.weekNumber !== selectedWeek) return w;
        const posts = editingPost
          ? w.posts.map((p, i) => i === editingPost.index ? post : p)
          : [...w.posts, post];
        return { ...w, posts };
      }));
      message.success(editingPost ? 'Post updated' : 'Post added');
      setIsPostDrawerVisible(false); postForm.resetFields(); setEditingPost(null);
    });
  };

  const handleSubmit = async () => {
    try {
      const vals = await form.validateFields();
      setLoading(true);
      await api.post('/api/reports', {
        ...vals, weeks,
        monthlyStaticTarget: totals.totalStatic,
        monthlyReelsTarget:  totals.totalReels,
        createdBy: localStorage.getItem('userId') || '67b8d8f1a3e5c91234567890',
      });
      message.success(`Report ${drawerMode === 'create' ? 'created' : 'updated'}`);
      setIsFormDrawerVisible(false); fetchReports();
    } catch (e) { if (e?.response) message.error(e.response?.data?.message || 'Save failed'); }
    finally { setLoading(false); }
  };

  const distributeNow = () => {
    const nw = calcWeekDist(mStatic, mReels);
    setWeeks(prev => nw.map((w, i) => ({
      ...w, posts: prev[i]?.posts || [],
      weekStartDate: prev[i]?.weekStartDate || null,
      weekEndDate:   prev[i]?.weekEndDate   || null,
    })));
    message.success('Targets distributed equally');
  };

  /* ── FIXED summary: target from API fields, completed = actual post count (no capping) ── */
  const summary = (() => {
    let ts = 0, tr = 0, tsc = 0, trc = 0;
    reports.forEach(rep => {
      ts  += rep.totalStaticTarget || 0;
      tr  += rep.totalReelsTarget  || 0;
      // actual post counts across all weeks — NO Math.min capping
      tsc += rep.weeks?.reduce((s, w) => s + (w.posts?.filter(p => p.type === 'static').length || 0), 0) || 0;
      trc += rep.weeks?.reduce((s, w) => s + (w.posts?.filter(p => p.type === 'reel').length   || 0), 0) || 0;
    });
    return {
      ts, tr, tsc, trc,
      ps:      Math.max(ts - tsc, 0),
      pr:      Math.max(tr - trc, 0),
      total:   ts + tr,
      done:    tsc + trc,
      pending: Math.max((ts - tsc) + (tr - trc), 0),
    };
  })();

  /* ── table columns ── */
  const makeProgressCol = (type, strokeColor) => ({
    title: type === 'static' ? 'Static' : 'Reels',
    key: type, width: 160,
    render: (_, rep) => {
      const total  = type === 'static' ? (rep.totalStaticTarget || 0) : (rep.totalReelsTarget || 0);
      // actual post count — NO Math.min capping
      const done   = rep.weeks?.reduce((s, w) =>
        s + (w.posts?.filter(p => p.type === (type === 'static' ? 'static' : 'reel')).length || 0), 0) || 0;
      const isDone = done >= total && total > 0;
      const pct    = total > 0 ? Math.min(Math.round(done / total * 100), 100) : 0;
      return (
        <div className="wrm-progress-cell">
          <span className="wrm-progress-cell__fraction">
            {done}<span> / {total}</span>
          </span>
          <Progress
            percent={pct}
            size="small"
            showInfo={false}
            strokeColor={isDone ? 'var(--teal-600)' : strokeColor}
            trailColor="var(--gray-100)"
          />
          <span className={`wrm-progress-cell__note ${isDone ? 'wrm-progress-cell__note--done' : 'wrm-progress-cell__note--pending'}`}>
            {isDone ? 'complete' : `${Math.max(total - done, 0)} pending`}
          </span>
        </div>
      );
    },
  });

  const columns = [
    {
      title: 'Account', key: 'account', fixed: 'left', width: 200,
      render: (_, rep) => <Text strong style={{ fontSize: 13 }}>{rep.businessAccount?.businessName || '-'}</Text>,
    },
    { title: 'Month', dataIndex: 'month', key: 'month', width: 110, sorter: (a, b) => a.month.localeCompare(b.month) },
    { title: 'Year',  dataIndex: 'year',  key: 'year',  width: 80,  sorter: (a, b) => a.year - b.year },
    makeProgressCol('static', 'var(--blue-600)'),
    makeProgressCol('reels',  'var(--teal-600)'),
    {
      title: 'Overall', key: 'overall', width: 90,
      render: (_, rep) => {
        const total = (rep.totalStaticTarget || 0) + (rep.totalReelsTarget || 0);
        const done  = rep.weeks?.reduce((s, w) => s + (w.posts?.length || 0), 0) || 0;
        const pct   = total > 0 ? Math.min(Math.round(done / total * 100), 100) : 0;
        return (
          <Progress type="circle" percent={pct} width={48}
            strokeColor={pct === 100 ? 'var(--teal-600)' : 'var(--blue-600)'}
            format={p => <span style={{ fontSize: 11, fontWeight: 500 }}>{p}%</span>} />
        );
      },
    },
    {
      title: 'Status', key: 'status', width: 110,
      render: (_, rep) => {
        const total = (rep.totalStaticTarget || 0) + (rep.totalReelsTarget || 0);
        const done  = rep.weeks?.reduce((s, w) => s + (w.posts?.length || 0), 0) || 0;
        if (done === 0)                 return <span className="wrm-pill wrm-pill--amber">Pending</span>;
        if (done >= total && total > 0) return <span className="wrm-pill wrm-pill--teal">Completed</span>;
        return <span className="wrm-pill wrm-pill--blue">In progress</span>;
      },
    },
    {
      title: '', key: 'actions', fixed: 'right', width: 140,
      render: (_, rep) => (
        <Space size={0}>
          <Button type="text" size="small" icon={<EyeOutlined />}
            onClick={() => { setSelectedReport(rep); setIsViewDrawerVisible(true); }}>View</Button>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(rep)}>Edit</Button>
          <Popconfirm title="Delete this report?" onConfirm={() => deleteReport(rep._id)}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  /* ── post table columns ── */
  const postColumns = (wn) => [
    { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: 'Type', dataIndex: 'type', key: 'type', width: 90,
      render: t => <span className={`wrm-pill ${t === 'static' ? 'wrm-pill--blue' : 'wrm-pill--teal'}`}>{t}</span>
    },
    {
      title: 'Date', dataIndex: 'postedDate', key: 'date', width: 120,
      render: d => d ? dayjs(d).format('DD MMM YYYY') : '-'
    },
    {
      title: 'Link', dataIndex: 'instagramLink', key: 'link', width: 70,
      render: l => l ? <a href={l} target="_blank" rel="noreferrer" style={{ color: 'var(--blue-600)' }}>Open</a> : '-'
    },
    {
      title: '', key: 'act', width: 80,
      render: (_, rec, idx) => (
        <Space size={0}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditPost(wn, idx, rec)} />
          <Popconfirm title="Remove post?" onConfirm={() => handleDeletePost(wn, idx)}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  /* ── week tab items ── */
  const tabItems = weeks.map(w => {
    const pct  = weekProgress(w);
    const sc   = w.posts?.filter(p => p.type === 'static').length || 0;
    const rc   = w.posts?.filter(p => p.type === 'reel').length   || 0;
    const done = pct === 100;
    const part = pct > 0 && pct < 100;

    return {
      key: `w${w.weekNumber}`,
      label: (
        <span className="wrm-tab-label">
          Week {w.weekNumber}
          {done && <CheckCircleOutlined className="wrm-tab-icon wrm-tab-icon--done" />}
          {part && <ClockCircleOutlined className="wrm-tab-icon wrm-tab-icon--partial" />}
          {!done && !part && <WarningOutlined className="wrm-tab-icon wrm-tab-icon--empty" />}
        </span>
      ),
      children: (
        <div className="wrm-week-panel">

          {/* progress strip */}
          <div className="wrm-week-progress-strip">
            <div className="wrm-week-progress-header">
              <span className="wrm-week-progress-label">Week {w.weekNumber} completion</span>
              <span className={`wrm-week-progress-pct ${done ? 'wrm-week-progress-pct--done' : 'wrm-week-progress-pct--active'}`}>
                {Math.round(pct)}%
              </span>
            </div>
            <Progress percent={Math.round(pct)} showInfo={false}
              strokeColor={done ? 'var(--teal-600)' : 'var(--blue-600)'}
              trailColor="var(--gray-100)" />
          </div>

          {/* stat tiles */}
          <Row gutter={12} style={{ marginBottom: 16 }}>
            {[
              { label: 'Static posts', val: sc, target: w.staticTarget },
              { label: 'Reels',        val: rc, target: w.reelsTarget  },
            ].map(c => (
              <Col span={12} key={c.label}>
                <div className="wrm-week-stat">
                  <span className="wrm-week-stat__label">{c.label}</span>
                  <span className={`wrm-week-stat__value ${c.val >= (c.target || 0) && c.target > 0 ? 'wrm-week-stat__value--done' : 'wrm-week-stat__value--active'}`}>
                    {c.val}
                    <span className="wrm-week-stat__suffix"> / {c.target || 0}</span>
                  </span>
                  {c.target > 0 && c.val < c.target && (
                    <span className="wrm-week-stat__remaining">{c.target - c.val} remaining</span>
                  )}
                  {c.val > c.target && c.target > 0 && (
                    <span className="wrm-week-stat__remaining" style={{ color: 'var(--teal-600)' }}>+{c.val - c.target} extra</span>
                  )}
                </div>
              </Col>
            ))}
          </Row>

          {/* target inputs */}
          <Row gutter={12} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Form.Item label={<Text className="wrm-input-label">Statics target</Text>} style={{ marginBottom: 0 }}>
                <InputNumber min={0} value={w.staticTarget}
                  onChange={v => handleWeekUpdate(w.weekNumber, 'staticTarget', v || 0)}
                  style={{ width: '100%' }} disabled={distType === 'equal'} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<Text className="wrm-input-label">Reels target</Text>} style={{ marginBottom: 0 }}>
                <InputNumber min={0} value={w.reelsTarget}
                  onChange={v => handleWeekUpdate(w.weekNumber, 'reelsTarget', v || 0)}
                  style={{ width: '100%' }} disabled={distType === 'equal'} />
              </Form.Item>
            </Col>
          </Row>

          {/* date inputs */}
          <Row gutter={12} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Form.Item label={<Text className="wrm-input-label">Week start</Text>} style={{ marginBottom: 0 }}>
                <DatePicker style={{ width: '100%' }}
                  value={w.weekStartDate ? dayjs(w.weekStartDate) : null}
                  onChange={d => handleWeekUpdate(w.weekNumber, 'weekStartDate', d ? d.toDate() : null)} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<Text className="wrm-input-label">Week end</Text>} style={{ marginBottom: 0 }}>
                <DatePicker style={{ width: '100%' }}
                  value={w.weekEndDate ? dayjs(w.weekEndDate) : null}
                  onChange={d => handleWeekUpdate(w.weekNumber, 'weekEndDate', d ? d.toDate() : null)} />
              </Form.Item>
            </Col>
          </Row>

          {/* posts */}
          <div className="wrm-posts-header">
            <p className="wrm-section-label" style={{ margin: 0 }}>Posts ({w.posts?.length || 0})</p>
            <Button size="small" icon={<PlusOutlined />} onClick={() => handleAddPost(w.weekNumber)}>Add post</Button>
          </div>

          {w.posts?.length > 0 ? (
            <Table size="small" dataSource={w.posts} rowKey={(_, i) => `${w.weekNumber}-${i}`}
              pagination={false} columns={postColumns(w.weekNumber)} />
          ) : (
            <div className="wrm-posts-empty">
              No posts yet — click <strong>Add post</strong> to begin
            </div>
          )}
        </div>
      ),
    };
  });

  /* ─────────────────── render ─────────────────── */
  return (
    <div className="wrm-page">

      {/* header */}
      <div className="wrm-page-header">
        <div>
          <Title level={3} className="wrm-page-title">Weekly Reports</Title>
          <span className="wrm-page-subtitle">Manage monthly content targets across weekly cycles</span>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} className="wrm-btn-primary">
          New report
        </Button>
      </div>

      {/* summary metrics */}
      <div className="wrm-metric-grid">
        {[
          { label: 'Statics target', val: summary.ts },
          { label: 'Reels target',   val: summary.tr },
        ].map(c => (
          <div className="wrm-metric" key={c.label}>
            <span className="wrm-metric__label" style={{ color: 'var(--blue-600)' }}>{c.label}</span>
            <span className="wrm-metric__value1">{c.val}</span>
          </div>
        ))}

        {/* Static Completion Rate */}
        <div className="wrm-metric">
          <span className="wrm-metric__label">Statics Completion Rate</span>
          <span className="wrm-metric__value">
            {summary.ts > 0 ? ((summary.tsc / summary.ts) * 100).toFixed(1) : 0}%
          </span>
          <Progress
            percent={summary.ts > 0 ? Math.min(Math.round((summary.tsc / summary.ts) * 100), 100) : 0}
            showInfo={false}
            strokeColor="var(--blue-600)"
            trailColor="var(--gray-100)"
            style={{ marginTop: 10, marginBottom: 0 }}
          />
          <div className="wrm-metric__sub" style={{ marginTop: 8 }}>
            <span className="wrm-metric__done">{summary.tsc} Completed</span>
            <span className="wrm-metric__pending">{summary.ps} Pending</span>
          </div>
        </div>

        {/* Reels Completion Rate */}
        <div className="wrm-metric">
          <span className="wrm-metric__label">Reels Completion Rate</span>
          <span className="wrm-metric__value">
            {summary.tr > 0 ? ((summary.trc / summary.tr) * 100).toFixed(1) : 0}%
          </span>
          <Progress
            percent={summary.tr > 0 ? Math.min(Math.round((summary.trc / summary.tr) * 100), 100) : 0}
            showInfo={false}
            strokeColor="var(--teal-600)"
            trailColor="var(--gray-100)"
            style={{ marginTop: 10, marginBottom: 0 }}
          />
          <div className="wrm-metric__sub" style={{ marginTop: 8 }}>
            <span className="wrm-metric__done">{summary.trc} Completed</span>
            <span className="wrm-metric__pending">{summary.pr} Pending</span>
          </div>
        </div>
      </div>

      {/* filters */}
      <div className="wrm-filters">
        <Row gutter={12} align="middle">
          <Col span={8}>
            <Select placeholder="Business account" style={{ width: '100%' }} allowClear
              value={filters.businessAccount || undefined}
              onChange={v => setFilters({ ...filters, businessAccount: v })}>
              {businessAccounts.map(a =>
                <Select.Option key={a._id} value={a._id}>{a.businessName || a.name || 'Unnamed'}</Select.Option>
              )}
            </Select>
          </Col>
          <Col span={4}>
            <Select placeholder="Month" style={{ width: '100%' }} allowClear
              value={filters.month || undefined}
              onChange={v => setFilters({ ...filters, month: v })}>
              {MONTHS.map(m => <Select.Option key={m} value={m}>{m}</Select.Option>)}
            </Select>
          </Col>
          <Col span={4}>
            <Select placeholder="Year" style={{ width: '100%' }} allowClear
              value={filters.year || undefined}
              onChange={v => setFilters({ ...filters, year: v })}>
              {YEARS.map(y => <Select.Option key={y} value={y}>{y}</Select.Option>)}
            </Select>
          </Col>
          <Col span={4}>
            <Button icon={<SearchOutlined />} onClick={fetchReports} block>Search</Button>
          </Col>
          <Col span={4}>
            <Button icon={<ReloadOutlined />}
              onClick={() => setFilters({ businessAccount: '', month: '', year: '' })} block>Reset</Button>
          </Col>
        </Row>
      </div>

      {/* table */}
      <div className="wrm-table-wrap">
        <Spin spinning={loading}>
          <Table
            className="wrm-table"
            columns={columns}
            dataSource={reports}
            rowKey={r => r._id}
            scroll={{ x: 1100 }}
            size="middle"
            pagination={{ pageSize: 10, showTotal: t => `${t} reports`, showSizeChanger: true, showQuickJumper: true }}
          />
        </Spin>
      </div>

      {/* ─── Create / Edit Drawer ─── */}
      <Drawer
        title={<Text style={{ fontSize: 15, fontWeight: 500 }}>{drawerMode === 'create' ? 'New report' : 'Edit report'}</Text>}
        placement="right" width={960}
        onClose={() => setIsFormDrawerVisible(false)}
        open={isFormDrawerVisible}
        destroyOnClose bodyStyle={{ paddingBottom: 80 }}
      >
        <Form form={form} layout="vertical" initialValues={{ year: new Date().getFullYear() }}>

          <div className="wrm-drawer-section">
            <p className="wrm-section-label">Report details</p>
            <Form.Item name="businessAccount" label="Business account" rules={[{ required: true }]}>
              <Select placeholder="Select account" showSearch>
                {businessAccounts.map(a =>
                  <Select.Option key={a._id} value={a._id}>{a.businessName || a.name || 'Unnamed'}</Select.Option>
                )}
              </Select>
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="month" label="Month" rules={[{ required: true }]}>
                  <Select placeholder="Month">
                    {MONTHS.map(m => <Select.Option key={m} value={m}>{m}</Select.Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="year" label="Year" rules={[{ required: true }]}>
                  <Select placeholder="Year">
                    {YEARS.map(y => <Select.Option key={y} value={y}>{y}</Select.Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="wrm-drawer-section">
            <p className="wrm-section-label">Monthly targets</p>
            <Row gutter={16}>
              <Col span={9}>
                <Form.Item label="Static posts target">
                  <InputNumber min={0} value={mStatic} onChange={v => setMStatic(v || 0)} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={9}>
                <Form.Item label="Reels target">
                  <InputNumber min={0} value={mReels} onChange={v => setMReels(v || 0)} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label=" ">
                  <Button icon={<ReloadOutlined />} onClick={distributeNow} block>Distribute</Button>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="Distribution">
              <Radio.Group value={distType} onChange={e => {
                setDistType(e.target.value);
                if (e.target.value === 'equal') distributeNow();
              }}>
                <Radio value="equal">Auto-distribute equally across 5 weeks</Radio>
                <Radio value="manual">Manual per week</Radio>
              </Radio.Group>
            </Form.Item>
          </div>

          <div className="wrm-monthly-strip">
            <Row gutter={24}>
              {[
                { label: 'Static', total: totals.totalStatic, done: totals.totalStaticCompleted },
                { label: 'Reels',  total: totals.totalReels,  done: totals.totalReelsCompleted  },
              ].map(c => (
                <Col span={10} key={c.label}>
                  <span className="wrm-monthly-strip__label">{c.label}</span>
                  <span className="wrm-monthly-strip__value">
                    {c.done}<span className="wrm-monthly-strip__suffix"> / {c.total}</span>
                  </span>
                  <span className="wrm-monthly-strip__pending">{Math.max(c.total - c.done, 0)} pending</span>
                </Col>
              ))}
              <Col span={4}>
                <span className="wrm-monthly-strip__label">Progress</span>
                <Progress type="circle" percent={Math.min(Math.round(totals.overallProgress), 100)} width={52}
                  strokeColor="var(--blue-600)" trailColor="var(--blue-200)"
                  format={p => <span style={{ fontSize: 11, color: 'var(--blue-800)' }}>{p}%</span>} />
              </Col>
            </Row>
          </div>

          <p className="wrm-section-label">Weekly breakdown</p>
          <Tabs items={tabItems} defaultActiveKey="w1" type="card" size="small" />

          <div className="wrm-drawer-actions">
            <Button onClick={() => setIsFormDrawerVisible(false)} icon={<CloseOutlined />}>Cancel</Button>
            <Button type="primary" loading={loading} onClick={handleSubmit}
              icon={<SaveOutlined />} className="wrm-btn-primary">
              {drawerMode === 'create' ? 'Create report' : 'Update report'}
            </Button>
          </div>
        </Form>
      </Drawer>

      {/* ─── View Drawer ─── */}
      <Drawer
        title={<Text style={{ fontSize: 15, fontWeight: 500 }}>Report details</Text>}
        placement="right" width={900}
        onClose={() => setIsViewDrawerVisible(false)}
        open={isViewDrawerVisible}
        bodyStyle={{ paddingBottom: 80 }}
      >
        {selectedReport && (
          <>
            <div className="wrm-drawer-section">
              <p className="wrm-section-label">Overview</p>
              <Row gutter={16}>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: 'var(--gray-400)' }}>Account</Text><br />
                  <Text style={{ fontSize: 14, fontWeight: 500 }}>{selectedReport.businessAccount?.businessName || '-'}</Text>
                </Col>
                <Col span={6}>
                  <Text style={{ fontSize: 12, color: 'var(--gray-400)' }}>Month</Text><br />
                  <Text style={{ fontSize: 14, fontWeight: 500 }}>{selectedReport.month}</Text>
                </Col>
                <Col span={6}>
                  <Text style={{ fontSize: 12, color: 'var(--gray-400)' }}>Year</Text><br />
                  <Text style={{ fontSize: 14, fontWeight: 500 }}>{selectedReport.year}</Text>
                </Col>
              </Row>
            </div>

            <Row gutter={12} style={{ marginBottom: 20 }}>
              <Col span={12}>
                <div className="wrm-metric">
                  <span className="wrm-metric__label">Statics target</span>
                  <span className="wrm-metric__value">{selectedReport.totalStaticTarget || 0}</span>
                </div>
              </Col>
              <Col span={12}>
                <div className="wrm-metric">
                  <span className="wrm-metric__label">Reels target</span>
                  <span className="wrm-metric__value">{selectedReport.totalReelsTarget || 0}</span>
                </div>
              </Col>
            </Row>

            <p className="wrm-section-label">Weekly breakdown</p>
            {WEEK_NOS.map(wn => {
              const w = selectedReport.weeks?.find(x => x.weekNumber === wn);
              if (!w) return null;
              // actual post counts — NO capping
              const sc = w.posts?.filter(p => p.type === 'static').length || 0;
              const rc = w.posts?.filter(p => p.type === 'reel').length   || 0;
              return (
                <div key={wn} className="wrm-view-week">
                  <div className="wrm-view-week__header">
                    <span className="wrm-view-week__title">Week {wn}</span>
                    <Space>
                      <span className="wrm-pill wrm-pill--blue">Static {sc}/{w.staticTarget || 0}</span>
                      <span className="wrm-pill wrm-pill--teal">Reels {rc}/{w.reelsTarget || 0}</span>
                    </Space>
                  </div>
                  {w.weekStartDate && w.weekEndDate && (
                    <span className="wrm-view-week__date">
                      <CalendarOutlined /> {dayjs(w.weekStartDate).format('DD MMM')} – {dayjs(w.weekEndDate).format('DD MMM YYYY')}
                    </span>
                  )}
                  {w.posts?.length > 0 ? (
                    <Table size="small" pagination={false} dataSource={w.posts}
                      rowKey={(_, i) => `v${wn}${i}`}
                      columns={[
                        { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true },
                        {
                          title: 'Type', dataIndex: 'type', key: 'type', width: 90,
                          render: t => <span className={`wrm-pill ${t === 'static' ? 'wrm-pill--blue' : 'wrm-pill--teal'}`}>{t}</span>
                        },
                        {
                          title: 'Date', dataIndex: 'postedDate', key: 'date', width: 120,
                          render: d => d ? dayjs(d).format('DD MMM YYYY') : '-'
                        },
                        {
                          title: 'Link', dataIndex: 'instagramLink', key: 'link', width: 70,
                          render: l => l ? <a href={l} target="_blank" rel="noreferrer" style={{ color: 'var(--blue-600)' }}>Open</a> : '-'
                        },
                        { title: 'Notes', dataIndex: 'notes', key: 'notes', ellipsis: true },
                      ]}
                    />
                  ) : (
                    <span className="wrm-view-week__empty">No posts recorded</span>
                  )}
                </div>
              );
            })}
          </>
        )}
      </Drawer>

      {/* ─── Add / Edit Post Drawer ─── */}
      <Drawer
        title={<Text style={{ fontSize: 15, fontWeight: 500 }}>{editingPost ? 'Edit post' : 'Add post'}</Text>}
        placement="right" width={480}
        onClose={() => { setIsPostDrawerVisible(false); postForm.resetFields(); setEditingPost(null); }}
        open={isPostDrawerVisible}
        bodyStyle={{ paddingBottom: 80 }}
      >
        <Form form={postForm} layout="vertical">
          <Form.Item name="title" label="Post title" rules={[{ required: true, message: 'Enter a title' }]}>
            <Input placeholder="e.g. Product launch carousel" />
          </Form.Item>
          <Form.Item name="type" label="Post type" rules={[{ required: true, message: 'Select type' }]}>
            <Select placeholder="Select type">
              <Select.Option value="static">Statics post</Select.Option>
              <Select.Option value="reel">Reel video</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="instagramLink" label="Instagram link">
            <Input placeholder="https://instagram.com/p/..." />
          </Form.Item>
          <Form.Item name="postedDate" label="Posted date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Any additional context..." />
          </Form.Item>
          <div className="wrm-drawer-actions">
            <Button onClick={() => { setIsPostDrawerVisible(false); postForm.resetFields(); setEditingPost(null); }}>
              Cancel
            </Button>
            <Button type="primary" onClick={handleSavePost} className="wrm-btn-primary">
              {editingPost ? 'Update' : 'Add post'}
            </Button>
          </div>
        </Form>
      </Drawer>

    </div>
  );
};

export default WeeklyReportManager;
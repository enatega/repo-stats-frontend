import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CSVLink } from "react-csv";
import "./RepoStats.css";

const API_BASE = "https://repo-stats-backend-production.up.railway.app/api";
// const API_BASE = "http://localhost:3000/api";

function RepoStats() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [viewData, setViewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allData, setAllData] = useState([]);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/accounts`)
      .then((res) => res.json())
      .then((data) => {
        console.log("Fetched accounts:", data);
        if (Array.isArray(data)) {
          setAccounts(data);
        } else {
          console.error("Expected array of accounts, got:", data);
          setAccounts([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching accounts:", err);
        setAccounts([]);
      });
  }, []);

  useEffect(() => {
    if (!selectedAccount) return;
    fetch(`${API_BASE}/repos?account=${encodeURIComponent(selectedAccount)}`)
      .then((res) => res.json())
      .then((data) => setRepos(data))
      .catch((err) => console.error("Error fetching repos:", err));
  }, [selectedAccount]);

  useEffect(() => {
    if (!selectedAccount || !selectedRepo) return;
    setLoading(true);

    let url = `${API_BASE}/views?account=${encodeURIComponent(
      selectedAccount
    )}&repo=${encodeURIComponent(selectedRepo)}`;

    // Include date range in the request if provided
    if (startDate) {
      url += `&startDate=${startDate}`;
    }
    if (endDate) {
      url += `&endDate=${endDate}`;
    }

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const filled = fillMissingDates(data);
        setViewData(filled);
      })
      .catch((err) => console.error("Error fetching view data:", err))
      .finally(() => setLoading(false));
  }, [selectedAccount, selectedRepo, startDate, endDate]);

  useEffect(() => {
    fetch(`${API_BASE}/views/all`)
      .then((res) => res.json())
      .then((data) => setAllData(data))
      .catch((err) => console.error("Error fetching all data:", err));
  }, []);

  

  function fillMissingDates(data) {
    if (!data.length) return [];
    const dateMap = new Map(data.map((d) => [d.date, d]));
    const allDates = [];
    const startDate = new Date(data[0].date);
    const endDate = new Date();
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      allDates.push({
        date: dateStr,
        views: dateMap.get(dateStr)?.views || 0,
        uniques: dateMap.get(dateStr)?.uniques || 0,
      });
    }
    return allDates;
  }

  // function getDateRange(start, end) {
  //   const range = [];
  //   let current = new Date(start);
  //   while (current <= end) {
  //     range.push(current.toISOString().slice(0, 10));
  //     current.setDate(current.getDate() + 1);
  //   }
  //   return range;
  // }

  function getExportDataWithSummary(data) {
    if (data.length === 0) return [];
  
    const minDate = startDate || data[0].date;
    const maxDate = endDate || data[data.length - 1].date;
  
    // Filter the raw data within the selected range
    const filtered = data.filter((row) => {
      const d = new Date(row.date);
      const min = new Date(minDate);
      const max = new Date(maxDate);
      return d >= min && d <= max;
    });
  
    // Group and sum views/uniques per repo
    const totalsMap = {};
  
    filtered.forEach((row) => {
      const key = `${row.account}::${row.repo_name}`;
      if (!totalsMap[key]) {
        totalsMap[key] = {
          account: row.account,
          repo_name: row.repo_name,
          views: 0,
          uniques: 0,
        };
      }
      totalsMap[key].views += row.views;
      totalsMap[key].uniques += row.uniques;
    });
  
    // Turn the totals map into an array
    const summaryRows = Object.values(totalsMap).map((row) => ({
      ...row,
      date_range: `${startDate || "START"} to ${endDate || "END"}`,
    }));
  
    return summaryRows;
  }
  

  const filteredData = viewData.filter((row) => {
    const date = new Date(row.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    return (!start || date >= start) && (!end || date <= end);
  });

  const totalViews = filteredData.reduce((sum, row) => sum + row.views, 0);
  const totalUniques = filteredData.reduce((sum, row) => sum + row.uniques, 0);

  return (
    <div className="container">
      <h2>📊 GitHub Repo Stats</h2>

      <label>
        Select GitHub Account:
        <select
          value={selectedAccount}
          onChange={(e) => {
            setSelectedAccount(e.target.value);
            setSelectedRepo("");
            setViewData([]);
          }}
        >
          <option value="">-- Choose an account --</option>
          {accounts.map((acct) => (
            <option key={acct} value={acct}>
              {acct}
            </option>
          ))}
        </select>
      </label>

      {selectedAccount && (
        <label>
          Select a repository:
          <select
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
          >
            <option value="">-- Choose a repo --</option>
            {repos.map((repo) => (
              <option key={repo} value={repo}>
                {repo}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="filter-controls">
        <label>
          Start Date:
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label>
          End Date:
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        <button
          className="clear-btn"
          onClick={() => {
            setStartDate("");
            setEndDate("");
          }}
        >
          Clear
        </button>
      </div>

      {loading && <p className="loading">⏳ Loading stats...</p>}

      {!loading && selectedRepo && viewData.length === 0 && (
        <p className="no-data">⚠️ No data available for this repository.</p>
      )}

      {!loading && viewData.length > 0 && (
        <>
          <table>
            <thead>
              <tr>
                <th>Repository Name</th>
                <th>Date</th>
                <th>Views</th>
                <th>Unique Users</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, i) => (
                <tr key={i}>
                  <td>{selectedRepo}</td>
                  <td>{row.date}</td>
                  <td>{row.views}</td>
                  <td>{row.uniques}</td>
                </tr>
              ))}
              <tr className="summary-row">
                <td colSpan="2">
                  <strong>Total</strong>
                </td>
                <td>
                  <strong>{totalViews}</strong>
                </td>
                <td>
                  <strong>{totalUniques}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ width: "100%", height: 400, marginTop: "2rem" }}>
            <h3>📈 Views and Unique Users Over Time</h3>
            <ResponsiveContainer>
              <LineChart data={viewData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="#8884d8"
                  name="Views"
                />
                <Line
                  type="monotone"
                  dataKey="uniques"
                  stroke="#82ca9d"
                  name="Unique Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {allData.length > 0 && (
        <div className="export-section">
          <label>
            <input
              type="checkbox"
              checked={includeSummary}
              onChange={() => setIncludeSummary(!includeSummary)}
            />
            Include summary row
          </label>
          <p>Exporting data from {startDate || 'start'} to {endDate || 'end'}</p>

          <CSVLink
  data={getExportDataWithSummary(allData)}
  filename={`github-repo-summary_${startDate || "start"}_to_${endDate || "end"}.csv`}
  className="btn"
  headers={[
    { label: "GitHub Account", key: "account" },
    { label: "Repository", key: "repo_name" },
    { label: "Date Range", key: "date_range" },
    { label: "Total Views", key: "views" },
    { label: "Total Unique Visitors", key: "uniques" },
  ]}
>
  ⬇️ Export Repo Totals to CSV
</CSVLink>


          
        </div>
      )}
    </div>
  );
}

export default RepoStats;

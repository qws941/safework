#!/usr/bin/env node

/**
 * 001번 양식 데이터를 기반으로 003, 004 요약 엑셀 파일 생성
 *
 * 003_Musculoskeletal_Questionnaire_Summary: 질문지 응답 요약
 * 004_Musculoskeletal_Statistics_Summary: 통계 요약
 */

import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Production API endpoint
const API_BASE_URL = 'https://safework.jclee.me';

/**
 * Fetch 001 form data from production API
 */
async function fetch001Data() {
  try {
    console.log('📥 Fetching 001 form data from production...');

    // Step 1: Get list of survey IDs
    const listResponse = await fetch(
      `${API_BASE_URL}/api/survey/d1/responses/001_musculoskeletal_symptom_survey?limit=1000`
    );

    if (!listResponse.ok) {
      throw new Error(`API request failed: ${listResponse.status} ${listResponse.statusText}`);
    }

    const listResult = await listResponse.json();

    if (!listResult.success) {
      throw new Error(`API error: ${listResult.error || 'Unknown error'}`);
    }

    console.log(`✅ Found ${listResult.responses.length} records`);

    // Step 2: Fetch detailed data for each survey
    console.log('📥 Fetching detailed data for each survey...');
    const detailedSurveys = [];

    for (const survey of listResult.responses) {
      try {
        const detailResponse = await fetch(`${API_BASE_URL}/api/survey/d1/response/${survey.id}`);

        if (detailResponse.ok) {
          const detailResult = await detailResponse.json();
          if (detailResult.success && detailResult.survey) {
            detailedSurveys.push(detailResult.survey);
          }
        }
      } catch (error) {
        console.warn(`⚠️  Failed to fetch details for survey ${survey.id}`);
      }
    }

    console.log(`✅ Fetched ${detailedSurveys.length} detailed records`);
    return detailedSurveys;
  } catch (error) {
    console.error('❌ Failed to fetch data:', error.message);
    throw error;
  }
}

/**
 * Parse responses JSON field
 */
function parseResponses(survey) {
  try {
    if (typeof survey.responses === 'string') {
      return JSON.parse(survey.responses);
    }
    return survey.responses || {};
  } catch (error) {
    console.warn(`⚠️  Failed to parse responses for survey ${survey.id}`);
    return {};
  }
}

/**
 * Generate 003 - Questionnaire Summary (질문지 요약)
 */
async function generate003Summary(surveys) {
  console.log('\n📊 Generating 003 - Questionnaire Summary...');

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('근골격계 질문지 요약');

  // Configure sheet
  sheet.properties.defaultRowHeight = 20;

  // Title
  const titleRow = sheet.addRow(['근골격계 증상조사 질문지 요약']);
  titleRow.font = { size: 16, bold: true };
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.mergeCells('A1:F1');
  titleRow.height = 30;

  // Summary info
  sheet.addRow([]);
  sheet.addRow(['생성일시:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })]);
  sheet.addRow(['총 응답 수:', surveys.length + '명']);
  sheet.addRow([]);

  // Section 1: 기본 정보 통계
  const headerRow1 = sheet.addRow(['1. 기본 정보 통계']);
  headerRow1.font = { size: 14, bold: true };
  headerRow1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  sheet.mergeCells(`A${headerRow1.number}:F${headerRow1.number}`);

  sheet.addRow([]);

  // Gender distribution
  const genderStats = { '남': 0, '여': 0, '미응답': 0 };
  const ageGroups = { '20대': 0, '30대': 0, '40대': 0, '50대': 0, '60대 이상': 0 };
  const marriedStats = { '기혼': 0, '미혼': 0, '미응답': 0 };

  surveys.forEach(survey => {
    const responses = parseResponses(survey);

    // Gender
    const gender = responses.gender || survey.gender;
    if (gender === '남' || gender === '여') {
      genderStats[gender]++;
    } else {
      genderStats['미응답']++;
    }

    // Age groups
    const age = responses.age || survey.age;
    if (age) {
      if (age < 30) ageGroups['20대']++;
      else if (age < 40) ageGroups['30대']++;
      else if (age < 50) ageGroups['40대']++;
      else if (age < 60) ageGroups['50대']++;
      else ageGroups['60대 이상']++;
    }

    // Married status
    const married = responses.married;
    if (married === '기혼' || married === '미혼') {
      marriedStats[married]++;
    } else {
      marriedStats['미응답']++;
    }
  });

  sheet.addRow(['항목', '값', '인원', '비율(%)', '', '']);
  const genderRow = sheet.addRow(['성별', '', '', '', '', '']);
  genderRow.font = { bold: true };
  Object.entries(genderStats).forEach(([key, value]) => {
    const pct = ((value / surveys.length) * 100).toFixed(1);
    sheet.addRow(['', key, value, pct, '', '']);
  });

  sheet.addRow([]);
  const ageRow = sheet.addRow(['연령대', '', '', '', '', '']);
  ageRow.font = { bold: true };
  Object.entries(ageGroups).forEach(([key, value]) => {
    const pct = ((value / surveys.length) * 100).toFixed(1);
    sheet.addRow(['', key, value, pct, '', '']);
  });

  sheet.addRow([]);
  const marriedRow = sheet.addRow(['결혼여부', '', '', '', '', '']);
  marriedRow.font = { bold: true };
  Object.entries(marriedStats).forEach(([key, value]) => {
    const pct = ((value / surveys.length) * 100).toFixed(1);
    sheet.addRow(['', key, value, pct, '', '']);
  });

  // Section 2: 통증 부위별 응답 현황
  sheet.addRow([]);
  sheet.addRow([]);
  const headerRow2 = sheet.addRow(['2. 통증 부위별 응답 현황']);
  headerRow2.font = { size: 14, bold: true };
  headerRow2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  sheet.mergeCells(`A${headerRow2.number}:F${headerRow2.number}`);

  sheet.addRow([]);

  const bodyParts = [
    { name: '목', prefix: 'neck' },
    { name: '어깨', prefix: 'shoulder' },
    { name: '팔/팔꿈치', prefix: 'arm_elbow' },
    { name: '손목/손', prefix: 'wrist_hand' },
    { name: '허리', prefix: 'back' },
    { name: '다리/발', prefix: 'leg_foot' }
  ];

  const painLevels = ['없음', '가끔', '자주', '항상'];

  sheet.addRow(['신체 부위', '통증 없음', '가끔 통증', '자주 통증', '항상 통증', '응답률(%)']);

  bodyParts.forEach(part => {
    const painStats = { '없음': 0, '가끔': 0, '자주': 0, '항상': 0 };
    let responseCount = 0;

    surveys.forEach(survey => {
      const responses = parseResponses(survey);
      const frequency = responses[`${part.prefix}_pain_frequency`];

      if (frequency && painLevels.includes(frequency)) {
        painStats[frequency]++;
        responseCount++;
      }
    });

    const responseRate = ((responseCount / surveys.length) * 100).toFixed(1);

    sheet.addRow([
      part.name,
      painStats['없음'],
      painStats['가끔'],
      painStats['자주'],
      painStats['항상'],
      responseRate
    ]);
  });

  // Section 3: 업무 지장도 분석
  sheet.addRow([]);
  sheet.addRow([]);
  const headerRow3 = sheet.addRow(['3. 통증으로 인한 업무 지장도']);
  headerRow3.font = { size: 14, bold: true };
  headerRow3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  sheet.mergeCells(`A${headerRow3.number}:F${headerRow3.number}`);

  sheet.addRow([]);
  sheet.addRow(['신체 부위', '지장 없음', '지장 있음', '지장률(%)', '', '']);

  bodyParts.forEach(part => {
    const interferenceStats = { '없음': 0, '있음': 0 };

    surveys.forEach(survey => {
      const responses = parseResponses(survey);
      const interference = responses[`${part.prefix}_work_interference`];

      if (interference === '없음' || interference === '있음') {
        interferenceStats[interference]++;
      }
    });

    const total = interferenceStats['없음'] + interferenceStats['있음'];
    const interferenceRate = total > 0 ? ((interferenceStats['있음'] / total) * 100).toFixed(1) : '0.0';

    sheet.addRow([
      part.name,
      interferenceStats['없음'],
      interferenceStats['있음'],
      interferenceRate,
      '',
      ''
    ]);
  });

  // Column widths
  sheet.columns = [
    { width: 20 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 }
  ];

  // Save file
  const outputPath = path.join(__dirname, '../../data/003_Musculoskeletal_Questionnaire_Summary.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ 003 Summary saved: ${outputPath}`);
}

/**
 * Generate 004 - Statistics Summary (통계 요약)
 */
async function generate004Summary(surveys) {
  console.log('\n📊 Generating 004 - Statistics Summary...');

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('근골격계 통계 요약');

  // Configure sheet
  sheet.properties.defaultRowHeight = 20;

  // Title
  const titleRow = sheet.addRow(['근골격계 증상조사 통계 요약']);
  titleRow.font = { size: 16, bold: true };
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.mergeCells('A1:G1');
  titleRow.height = 30;

  // Summary info
  sheet.addRow([]);
  sheet.addRow(['생성일시:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })]);
  sheet.addRow(['분석 대상:', surveys.length + '명']);
  sheet.addRow([]);

  // Section 1: 전체 통증 유병률
  const headerRow1 = sheet.addRow(['1. 전체 통증 유병률 (Prevalence Rate)']);
  headerRow1.font = { size: 14, bold: true };
  headerRow1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
  sheet.mergeCells(`A${headerRow1.number}:G${headerRow1.number}`);

  sheet.addRow([]);

  const bodyParts = [
    { name: '목', prefix: 'neck' },
    { name: '어깨', prefix: 'shoulder' },
    { name: '팔/팔꿈치', prefix: 'arm_elbow' },
    { name: '손목/손', prefix: 'wrist_hand' },
    { name: '허리', prefix: 'back' },
    { name: '다리/발', prefix: 'leg_foot' }
  ];

  sheet.addRow(['신체 부위', '전체 응답자', '통증 있음', '유병률(%)', '심각도*', '', '']);

  bodyParts.forEach(part => {
    let painCount = 0;
    let severitySum = 0;

    surveys.forEach(survey => {
      const responses = parseResponses(survey);
      const frequency = responses[`${part.prefix}_pain_frequency`];

      if (frequency && frequency !== '없음') {
        painCount++;

        // Calculate severity score (0-3)
        const severityMap = { '가끔': 1, '자주': 2, '항상': 3 };
        severitySum += severityMap[frequency] || 0;
      }
    });

    const prevalenceRate = ((painCount / surveys.length) * 100).toFixed(1);
    const avgSeverity = painCount > 0 ? (severitySum / painCount).toFixed(2) : '0.00';

    sheet.addRow([
      part.name,
      surveys.length,
      painCount,
      prevalenceRate,
      avgSeverity,
      '',
      ''
    ]);
  });

  sheet.addRow([]);
  sheet.addRow(['* 심각도: 가끔=1, 자주=2, 항상=3의 평균값']);

  // Section 2: 성별 통증 유병률
  sheet.addRow([]);
  sheet.addRow([]);
  const headerRow2 = sheet.addRow(['2. 성별 통증 유병률']);
  headerRow2.font = { size: 14, bold: true };
  headerRow2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
  sheet.mergeCells(`A${headerRow2.number}:G${headerRow2.number}`);

  sheet.addRow([]);
  sheet.addRow(['신체 부위', '남성 응답자', '남성 통증', '남성 유병률(%)', '여성 응답자', '여성 통증', '여성 유병률(%)']);

  bodyParts.forEach(part => {
    const maleStats = { total: 0, pain: 0 };
    const femaleStats = { total: 0, pain: 0 };

    surveys.forEach(survey => {
      const responses = parseResponses(survey);
      const gender = responses.gender || survey.gender;
      const frequency = responses[`${part.prefix}_pain_frequency`];

      if (gender === '남') {
        maleStats.total++;
        if (frequency && frequency !== '없음') {
          maleStats.pain++;
        }
      } else if (gender === '여') {
        femaleStats.total++;
        if (frequency && frequency !== '없음') {
          femaleStats.pain++;
        }
      }
    });

    const maleRate = maleStats.total > 0 ? ((maleStats.pain / maleStats.total) * 100).toFixed(1) : '0.0';
    const femaleRate = femaleStats.total > 0 ? ((femaleStats.pain / femaleStats.total) * 100).toFixed(1) : '0.0';

    sheet.addRow([
      part.name,
      maleStats.total,
      maleStats.pain,
      maleRate,
      femaleStats.total,
      femaleStats.pain,
      femaleRate
    ]);
  });

  // Section 3: 연령대별 통증 유병률
  sheet.addRow([]);
  sheet.addRow([]);
  const headerRow3 = sheet.addRow(['3. 연령대별 통증 유병률']);
  headerRow3.font = { size: 14, bold: true };
  headerRow3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
  sheet.mergeCells(`A${headerRow3.number}:G${headerRow3.number}`);

  sheet.addRow([]);
  sheet.addRow(['신체 부위', '20대', '30대', '40대', '50대', '60대 이상', '']);

  bodyParts.forEach(part => {
    const ageStats = {
      '20대': { total: 0, pain: 0 },
      '30대': { total: 0, pain: 0 },
      '40대': { total: 0, pain: 0 },
      '50대': { total: 0, pain: 0 },
      '60대 이상': { total: 0, pain: 0 }
    };

    surveys.forEach(survey => {
      const responses = parseResponses(survey);
      const age = responses.age || survey.age;
      const frequency = responses[`${part.prefix}_pain_frequency`];

      let ageGroup;
      if (age < 30) ageGroup = '20대';
      else if (age < 40) ageGroup = '30대';
      else if (age < 50) ageGroup = '40대';
      else if (age < 60) ageGroup = '50대';
      else ageGroup = '60대 이상';

      if (ageStats[ageGroup]) {
        ageStats[ageGroup].total++;
        if (frequency && frequency !== '없음') {
          ageStats[ageGroup].pain++;
        }
      }
    });

    const rates = Object.entries(ageStats).map(([_, stats]) => {
      return stats.total > 0 ? ((stats.pain / stats.total) * 100).toFixed(1) + '%' : '0.0%';
    });

    sheet.addRow([
      part.name,
      ...rates,
      ''
    ]);
  });

  // Section 4: 근무시간별 통증 유병률
  sheet.addRow([]);
  sheet.addRow([]);
  const headerRow4 = sheet.addRow(['4. 근무시간별 통증 유병률']);
  headerRow4.font = { size: 14, bold: true };
  headerRow4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
  sheet.mergeCells(`A${headerRow4.number}:G${headerRow4.number}`);

  sheet.addRow([]);
  sheet.addRow(['신체 부위', '8시간 미만', '8시간', '9-10시간', '11-12시간', '12시간 초과', '']);

  bodyParts.forEach(part => {
    const workHourStats = {
      '8시간 미만': { total: 0, pain: 0 },
      '8시간': { total: 0, pain: 0 },
      '9-10시간': { total: 0, pain: 0 },
      '11-12시간': { total: 0, pain: 0 },
      '12시간 초과': { total: 0, pain: 0 }
    };

    surveys.forEach(survey => {
      const responses = parseResponses(survey);
      const workHours = responses.daily_work_hours;
      const frequency = responses[`${part.prefix}_pain_frequency`];

      let category;
      if (workHours < 8) category = '8시간 미만';
      else if (workHours === 8) category = '8시간';
      else if (workHours <= 10) category = '9-10시간';
      else if (workHours <= 12) category = '11-12시간';
      else category = '12시간 초과';

      if (workHourStats[category]) {
        workHourStats[category].total++;
        if (frequency && frequency !== '없음') {
          workHourStats[category].pain++;
        }
      }
    });

    const rates = Object.entries(workHourStats).map(([_, stats]) => {
      return stats.total > 0 ? ((stats.pain / stats.total) * 100).toFixed(1) + '%' : '0.0%';
    });

    sheet.addRow([
      part.name,
      ...rates,
      ''
    ]);
  });

  // Column widths
  sheet.columns = [
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 }
  ];

  // Save file
  const outputPath = path.join(__dirname, '../../data/004_Musculoskeletal_Statistics_Summary.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ 004 Summary saved: ${outputPath}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting musculoskeletal data summary generation...\n');

  try {
    // Fetch data
    const surveys = await fetch001Data();

    if (surveys.length === 0) {
      console.warn('⚠️  No survey data found. Exiting...');
      return;
    }

    // Generate summaries
    await generate003Summary(surveys);
    await generate004Summary(surveys);

    console.log('\n✅ All summaries generated successfully!');
    console.log('\n📁 Output files:');
    console.log('   - data/003_Musculoskeletal_Questionnaire_Summary.xlsx');
    console.log('   - data/004_Musculoskeletal_Statistics_Summary.xlsx');

  } catch (error) {
    console.error('\n❌ Error generating summaries:', error);
    process.exit(1);
  }
}

// Run
main();

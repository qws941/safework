#!/usr/bin/env python3
"""
Excel Processor for 002_musculoskeletal_symptom_program.xls
Processes Excel files and converts them to JSON format for the Cloudflare Worker
"""

import pandas as pd
import json
import base64
import requests
import os
import sys
from pathlib import Path

class ExcelToSurveyProcessor:
    """Processes Excel files for SafeWork survey system"""

    def __init__(self, worker_endpoint="https://safework.jclee.me/api/excel"):
        self.worker_endpoint = worker_endpoint
        self.supported_files = [
            "002_musculoskeletal_symptom_program.xls",
            "002_musculoskeletal_symptom_program.xlsx"
        ]

    def read_excel_file(self, file_path):
        """Read Excel file and return DataFrame"""
        try:
            if file_path.endswith('.xlsx'):
                df = pd.read_excel(file_path, engine='openpyxl')
            else:
                df = pd.read_excel(file_path, engine='xlrd')

            print(f"✅ Successfully read Excel file: {file_path}")
            print(f"📊 Dimensions: {df.shape[0]} rows x {df.shape[1]} columns")
            return df

        except Exception as e:
            print(f"❌ Error reading Excel file: {str(e)}")
            return None

    def extract_survey_structure(self, df):
        """Extract survey structure from Excel DataFrame"""
        survey_structure = {
            "formId": "002_musculoskeletal_symptom_program",
            "title": "근골격계부담작업 유해요인조사",
            "description": "근골격계 질환 예방을 위한 작업환경 유해요인 조사",
            "sections": [],
            "fields": []
        }

        # Parse Excel structure to identify sections and fields
        sections = {}
        fields = []

        for index, row in df.iterrows():
            # Skip empty rows
            if pd.isna(row).all():
                continue

            # Check if this is a section header (usually in first column)
            if not pd.isna(row.iloc[0]):
                section_name = str(row.iloc[0]).strip()

                # Identify field types based on column structure
                if len(row) > 1 and not pd.isna(row.iloc[1]):
                    field_type = self.identify_field_type(row)
                    field_id = self.generate_field_id(section_name)

                    field = {
                        "id": field_id,
                        "type": field_type,
                        "label": section_name,
                        "required": self.is_field_required(row),
                        "section": self.get_section_for_field(section_name)
                    }

                    # Add options for select fields
                    if field_type in ["select", "radio", "checkbox"]:
                        field["options"] = self.extract_field_options(row)

                    fields.append(field)

        # Group fields into sections
        survey_structure["fields"] = fields
        survey_structure["sections"] = self.group_fields_into_sections(fields)

        return survey_structure

    def identify_field_type(self, row):
        """Identify field type based on Excel row content"""
        # Check for dropdown/select indicators
        if any("선택" in str(cell) for cell in row if not pd.isna(cell)):
            return "select"

        # Check for checkbox indicators
        if any("체크" in str(cell) or "□" in str(cell) for cell in row if not pd.isna(cell)):
            return "checkbox"

        # Check for date indicators
        if any("날짜" in str(cell) or "일자" in str(cell) for cell in row if not pd.isna(cell)):
            return "date"

        # Check for number indicators
        if any("점수" in str(cell) or "수치" in str(cell) for cell in row if not pd.isna(cell)):
            return "number"

        # Check for textarea indicators
        if any("설명" in str(cell) or "의견" in str(cell) for cell in row if not pd.isna(cell)):
            return "textarea"

        # Default to text
        return "text"

    def generate_field_id(self, label):
        """Generate field ID from label"""
        import re
        # Remove special characters and convert to snake_case
        field_id = re.sub(r'[^\w\s]', '', label)
        field_id = re.sub(r'\s+', '_', field_id.strip())
        return field_id.lower()

    def is_field_required(self, row):
        """Determine if field is required based on Excel content"""
        required_indicators = ["필수", "required", "*"]
        return any(indicator in str(cell) for cell in row for indicator in required_indicators if not pd.isna(cell))

    def get_section_for_field(self, field_name):
        """Determine section for field based on field name"""
        field_lower = field_name.lower()

        if any(keyword in field_lower for keyword in ["회사", "부서", "조사자", "일자"]):
            return "basic_info"
        elif any(keyword in field_lower for keyword in ["자세", "반복", "힘", "진동"]):
            return "work_environment"
        elif any(keyword in field_lower for keyword in ["위험", "요인", "평가"]):
            return "risk_factors"
        elif any(keyword in field_lower for keyword in ["개선", "방안", "계획"]):
            return "recommendations"
        else:
            return "misc"

    def extract_field_options(self, row):
        """Extract options for select/radio/checkbox fields"""
        options = []
        for cell in row[1:]:  # Skip first column (label)
            if not pd.isna(cell):
                option = str(cell).strip()
                if option and option not in options:
                    options.append(option)

        return options if options else ["예", "아니오"]

    def group_fields_into_sections(self, fields):
        """Group fields into logical sections"""
        sections = {
            "basic_info": {"id": "basic_info", "title": "기본 정보", "fields": []},
            "work_environment": {"id": "work_environment", "title": "작업환경 평가", "fields": []},
            "risk_factors": {"id": "risk_factors", "title": "위험요인 분석", "fields": []},
            "recommendations": {"id": "recommendations", "title": "개선방안", "fields": []},
            "misc": {"id": "misc", "title": "기타", "fields": []}
        }

        for field in fields:
            section_id = field.get("section", "misc")
            if section_id in sections:
                sections[section_id]["fields"].append(field["id"])

        # Remove empty sections
        return [section for section in sections.values() if section["fields"]]

    def encode_file_for_worker(self, file_path):
        """Encode file content for sending to worker"""
        try:
            with open(file_path, 'rb') as f:
                file_content = f.read()
                encoded_content = base64.b64encode(file_content).decode('utf-8')
                return encoded_content
        except Exception as e:
            print(f"❌ Error encoding file: {str(e)}")
            return None

    def send_to_worker(self, file_path):
        """Send Excel file to Cloudflare Worker for processing"""
        file_name = os.path.basename(file_path)

        if file_name not in self.supported_files:
            print(f"❌ Unsupported file: {file_name}")
            return False

        encoded_data = self.encode_file_for_worker(file_path)
        if not encoded_data:
            return False

        payload = {
            "fileData": encoded_data,
            "fileName": file_name
        }

        try:
            response = requests.post(
                f"{self.worker_endpoint}/process-excel",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                print(f"✅ Successfully processed by worker:")
                print(f"   Survey ID: {result.get('surveyId')}")
                print(f"   Fields Count: {result.get('fieldsCount')}")
                print(f"   Sections: {result.get('sections')}")
                return True
            else:
                print(f"❌ Worker processing failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False

        except Exception as e:
            print(f"❌ Error sending to worker: {str(e)}")
            return False

    def process_file_locally(self, file_path, output_path=None):
        """Process Excel file locally and save JSON structure"""
        df = self.read_excel_file(file_path)
        if df is None:
            return False

        survey_structure = self.extract_survey_structure(df)

        if output_path is None:
            output_path = file_path.replace('.xls', '_structure.json').replace('.xlsx', '_structure.json')

        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(survey_structure, f, ensure_ascii=False, indent=2)

            print(f"✅ Survey structure saved to: {output_path}")
            print(f"📝 Summary:")
            print(f"   Title: {survey_structure['title']}")
            print(f"   Sections: {len(survey_structure['sections'])}")
            print(f"   Fields: {len(survey_structure['fields'])}")

            return True

        except Exception as e:
            print(f"❌ Error saving structure: {str(e)}")
            return False

def main():
    """Main function for command line usage"""
    if len(sys.argv) < 2:
        print("Usage: python excel_processor.py <excel_file_path> [--local] [--worker] [--output <output_path>]")
        print("Options:")
        print("  --local   Process locally and save JSON structure")
        print("  --worker  Send to Cloudflare Worker for processing")
        print("  --output  Specify output path for local processing")
        sys.exit(1)

    file_path = sys.argv[1]

    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        sys.exit(1)

    processor = ExcelToSurveyProcessor()

    # Parse command line options
    local_processing = "--local" in sys.argv
    worker_processing = "--worker" in sys.argv
    output_path = None

    if "--output" in sys.argv:
        output_index = sys.argv.index("--output")
        if output_index + 1 < len(sys.argv):
            output_path = sys.argv[output_index + 1]

    # Default to local processing if no option specified
    if not local_processing and not worker_processing:
        local_processing = True

    success = True

    if local_processing:
        print("🔄 Processing Excel file locally...")
        success &= processor.process_file_locally(file_path, output_path)

    if worker_processing:
        print("🔄 Sending to Cloudflare Worker...")
        success &= processor.send_to_worker(file_path)

    if success:
        print("✅ Processing completed successfully!")
    else:
        print("❌ Processing failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
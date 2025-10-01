#!/usr/bin/env python3
"""
Initialize Warning Sign Reference Data
Populate GHS pictograms, hazard statements, and precautionary statements
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.app import create_app, db
from app.models_warning_sign import (
    GHSPictogram, HazardStatement, PrecautionaryStatement,
    WarningSignTemplate
)


def init_ghs_pictograms():
    """Initialize GHS pictograms"""
    pictograms = [
        {
            'code': 'GHS01',
            'name_ko': '폭발성 물질',
            'name_en': 'Explosive',
            'description_ko': '불안정 폭발성, 등급 1.1~1.6 폭발물, 자기반응성 물질 및 혼합물',
            'description_en': 'Unstable explosives, Division 1.1-1.6 explosives, Self-reactive substances and mixtures',
            'hazard_class': '물리적 위험성',
            'display_order': 1
        },
        {
            'code': 'GHS02',
            'name_ko': '인화성 물질',
            'name_en': 'Flammable',
            'description_ko': '인화성 가스, 에어로졸, 인화성 액체, 인화성 고체',
            'description_en': 'Flammable gases, aerosols, liquids, solids',
            'hazard_class': '물리적 위험성',
            'display_order': 2
        },
        {
            'code': 'GHS03',
            'name_ko': '산화성 물질',
            'name_en': 'Oxidizing',
            'description_ko': '산화성 가스, 산화성 액체, 산화성 고체',
            'description_en': 'Oxidizing gases, liquids, solids',
            'hazard_class': '물리적 위험성',
            'display_order': 3
        },
        {
            'code': 'GHS04',
            'name_ko': '고압가스',
            'name_en': 'Gases under pressure',
            'description_ko': '압축가스, 액화가스, 냉동액화가스, 용존가스',
            'description_en': 'Compressed gases, Liquefied gases, Refrigerated liquefied gases, Dissolved gases',
            'hazard_class': '물리적 위험성',
            'display_order': 4
        },
        {
            'code': 'GHS05',
            'name_ko': '부식성 물질',
            'name_en': 'Corrosive',
            'description_ko': '금속 부식성 물질, 피부 부식성/자극성',
            'description_en': 'Corrosive to metals, Skin corrosion/irritation',
            'hazard_class': '건강 유해성',
            'display_order': 5
        },
        {
            'code': 'GHS06',
            'name_ko': '급성 독성',
            'name_en': 'Acute toxicity',
            'description_ko': '급성 독성 (경구, 경피, 흡입)',
            'description_en': 'Acute toxicity (oral, dermal, inhalation)',
            'hazard_class': '건강 유해성',
            'display_order': 6
        },
        {
            'code': 'GHS07',
            'name_ko': '유해성 물질',
            'name_en': 'Harmful',
            'description_ko': '급성 독성 (경구, 경피, 흡입), 피부 자극성, 눈 자극성, 피부 과민성, 특정표적장기 독성',
            'description_en': 'Acute toxicity, Skin irritation, Eye irritation, Skin sensitization, Specific target organ toxicity',
            'hazard_class': '건강 유해성',
            'display_order': 7
        },
        {
            'code': 'GHS08',
            'name_ko': '건강 유해성',
            'name_en': 'Health hazard',
            'description_ko': '호흡기 과민성, 생식세포 변이원성, 발암성, 생식독성, 특정표적장기 독성, 흡인 유해성',
            'description_en': 'Respiratory sensitization, Germ cell mutagenicity, Carcinogenicity, Reproductive toxicity, STOT, Aspiration hazard',
            'hazard_class': '건강 유해성',
            'display_order': 8
        },
        {
            'code': 'GHS09',
            'name_ko': '환경 유해성',
            'name_en': 'Environmental hazard',
            'description_ko': '수생환경 유해성 (급성/만성)',
            'description_en': 'Hazardous to the aquatic environment (acute/chronic)',
            'hazard_class': '환경 유해성',
            'display_order': 9
        }
    ]

    for data in pictograms:
        pictogram = GHSPictogram.query.filter_by(code=data['code']).first()
        if not pictogram:
            pictogram = GHSPictogram(**data)
            db.session.add(pictogram)
            print(f"Added pictogram: {data['code']} - {data['name_ko']}")
        else:
            print(f"Pictogram already exists: {data['code']}")

    db.session.commit()
    print(f"\nInitialized {len(pictograms)} GHS pictograms")


def init_hazard_statements():
    """Initialize common hazard statements (H-codes)"""
    statements = [
        # Physical hazards
        {'code': 'H200', 'text_ko': '불안정 폭발성', 'text_en': 'Unstable explosive', 'hazard_class': '물리적 위험성', 'signal_word': 'Danger', 'related_pictograms': ['GHS01']},
        {'code': 'H201', 'text_ko': '폭발성; 대폭발 위험', 'text_en': 'Explosive; mass explosion hazard', 'hazard_class': '물리적 위험성', 'signal_word': 'Danger', 'related_pictograms': ['GHS01']},
        {'code': 'H220', 'text_ko': '극인화성 가스', 'text_en': 'Extremely flammable gas', 'hazard_class': '물리적 위험성', 'signal_word': 'Danger', 'related_pictograms': ['GHS02']},
        {'code': 'H221', 'text_ko': '인화성 가스', 'text_en': 'Flammable gas', 'hazard_class': '물리적 위험성', 'signal_word': 'Warning', 'related_pictograms': ['GHS02']},
        {'code': 'H222', 'text_ko': '극인화성 에어로졸', 'text_en': 'Extremely flammable aerosol', 'hazard_class': '물리적 위험성', 'signal_word': 'Danger', 'related_pictograms': ['GHS02']},
        {'code': 'H224', 'text_ko': '극인화성 액체 및 증기', 'text_en': 'Extremely flammable liquid and vapour', 'hazard_class': '물리적 위험성', 'signal_word': 'Danger', 'related_pictograms': ['GHS02']},
        {'code': 'H225', 'text_ko': '고인화성 액체 및 증기', 'text_en': 'Highly flammable liquid and vapour', 'hazard_class': '물리적 위험성', 'signal_word': 'Danger', 'related_pictograms': ['GHS02']},
        {'code': 'H226', 'text_ko': '인화성 액체 및 증기', 'text_en': 'Flammable liquid and vapour', 'hazard_class': '물리적 위험성', 'signal_word': 'Warning', 'related_pictograms': ['GHS02']},
        {'code': 'H270', 'text_ko': '화재를 일으키거나 강렬하게 함; 산화제', 'text_en': 'May cause or intensify fire; oxidizer', 'hazard_class': '물리적 위험성', 'signal_word': 'Danger', 'related_pictograms': ['GHS03']},
        {'code': 'H271', 'text_ko': '화재 또는 폭발을 일으킬 수 있음; 강산화제', 'text_en': 'May cause fire or explosion; strong oxidizer', 'hazard_class': '물리적 위험성', 'signal_word': 'Danger', 'related_pictograms': ['GHS03']},
        {'code': 'H280', 'text_ko': '고압가스; 가열하면 폭발할 수 있음', 'text_en': 'Contains gas under pressure; may explode if heated', 'hazard_class': '물리적 위험성', 'signal_word': 'Warning', 'related_pictograms': ['GHS04']},
        {'code': 'H281', 'text_ko': '냉동액화가스; 극저온 화상 또는 손상을 일으킬 수 있음', 'text_en': 'Contains refrigerated gas; may cause cryogenic burns or injury', 'hazard_class': '물리적 위험성', 'signal_word': 'Warning', 'related_pictograms': ['GHS04']},

        # Health hazards
        {'code': 'H300', 'text_ko': '삼키면 치명적임', 'text_en': 'Fatal if swallowed', 'hazard_class': '건강 유해성', 'signal_word': 'Danger', 'related_pictograms': ['GHS06']},
        {'code': 'H301', 'text_ko': '삼키면 유독함', 'text_en': 'Toxic if swallowed', 'hazard_class': '건강 유해성', 'signal_word': 'Danger', 'related_pictograms': ['GHS06']},
        {'code': 'H302', 'text_ko': '삼키면 유해함', 'text_en': 'Harmful if swallowed', 'hazard_class': '건강 유해성', 'signal_word': 'Warning', 'related_pictograms': ['GHS07']},
        {'code': 'H304', 'text_ko': '삼켜서 기도로 유입되면 치명적일 수 있음', 'text_en': 'May be fatal if swallowed and enters airways', 'hazard_class': '건강 유해성', 'signal_word': 'Danger', 'related_pictograms': ['GHS08']},
        {'code': 'H310', 'text_ko': '피부에 접촉하면 치명적임', 'text_en': 'Fatal in contact with skin', 'hazard_class': '건강 유해성', 'signal_word': 'Danger', 'related_pictograms': ['GHS06']},
        {'code': 'H311', 'text_ko': '피부에 접촉하면 유독함', 'text_en': 'Toxic in contact with skin', 'hazard_class': '건강 유해성', 'signal_word': 'Danger', 'related_pictograms': ['GHS06']},
        {'code': 'H312', 'text_ko': '피부에 접촉하면 유해함', 'text_en': 'Harmful in contact with skin', 'hazard_class': '건강 유해성', 'signal_word': 'Warning', 'related_pictograms': ['GHS07']},
        {'code': 'H314', 'text_ko': '피부에 심한 화상과 눈 손상을 일으킴', 'text_en': 'Causes severe skin burns and eye damage', 'hazard_class': '건강 유해성', 'signal_word': 'Danger', 'related_pictograms': ['GHS05']},
        {'code': 'H315', 'text_ko': '피부에 자극을 일으킴', 'text_en': 'Causes skin irritation', 'hazard_class': '건강 유해성', 'signal_word': 'Warning', 'related_pictograms': ['GHS07']},
        {'code': 'H317', 'text_ko': '알레르기성 피부 반응을 일으킬 수 있음', 'text_en': 'May cause an allergic skin reaction', 'hazard_class': '건강 유해성', 'signal_word': 'Warning', 'related_pictograms': ['GHS07']},
        {'code': 'H318', 'text_ko': '눈에 심한 손상을 일으킴', 'text_en': 'Causes serious eye damage', 'hazard_class': '건강 유해성', 'signal_word': 'Danger', 'related_pictograms': ['GHS05']},
        {'code': 'H319', 'text_ko': '눈에 심한 자극을 일으킴', 'text_en': 'Causes serious eye irritation', 'hazard_class': '건강 유해성', 'signal_word': 'Warning', 'related_pictograms': ['GHS07']},
        {'code': 'H330', 'text_ko': '흡입하면 치명적임', 'text_en': 'Fatal if inhaled', 'hazard_class': '건강 유해성', 'signal_word': 'Danger', 'related_pictograms': ['GHS06']},
        {'code': 'H331', 'text_ko': '흡입하면 유독함', 'text_en': 'Toxic if inhaled', 'hazard_class': '건강 유해성', 'signal_word': 'Danger', 'related_pictograms': ['GHS06']},
        {'code': 'H332', 'text_ko': '흡입하면 유해함', 'text_en': 'Harmful if inhaled', 'hazard_class': '건강 유해성', 'signal_word': 'Warning', 'related_pictograms': ['GHS07']},
        {'code': 'H334', 'text_ko': '흡입 시 알레르기성 반응, 천식 또는 호흡 곤란을 일으킬 수 있음', 'text_en': 'May cause allergy or asthma symptoms or breathing difficulties if inhaled', 'hazard_class': '건강 유해성', 'signal_word': 'Danger', 'related_pictograms': ['GHS08']},
        {'code': 'H340', 'text_ko': '유전적인 결함을 일으킬 수 있음', 'text_en': 'May cause genetic defects', 'hazard_class': '건강 유해성', 'signal_word': 'Danger', 'related_pictograms': ['GHS08']},
        {'code': 'H341', 'text_ko': '유전적인 결함을 일으킬 것으로 의심됨', 'text_en': 'Suspected of causing genetic defects', 'hazard_class': '건강 유해성', 'signal_word': 'Warning', 'related_pictograms': ['GHS08']},
        {'code': 'H350', 'text_ko': '암을 일으킬 수 있음', 'text_en': 'May cause cancer', 'hazard_class': '건강 유해성', 'signal_word': 'Danger', 'related_pictograms': ['GHS08']},
        {'code': 'H351', 'text_ko': '암을 일으킬 것으로 의심됨', 'text_en': 'Suspected of causing cancer', 'hazard_class': '건강 유해성', 'signal_word': 'Warning', 'related_pictograms': ['GHS08']},
        {'code': 'H360', 'text_ko': '태아 또는 생식능력에 손상을 일으킬 수 있음', 'text_en': 'May damage fertility or the unborn child', 'hazard_class': '건강 유해성', 'signal_word': 'Danger', 'related_pictograms': ['GHS08']},
        {'code': 'H361', 'text_ko': '태아 또는 생식능력에 손상을 일으킬 것으로 의심됨', 'text_en': 'Suspected of damaging fertility or the unborn child', 'hazard_class': '건강 유해성', 'signal_word': 'Warning', 'related_pictograms': ['GHS08']},
        {'code': 'H370', 'text_ko': '장기에 손상을 일으킴', 'text_en': 'Causes damage to organs', 'hazard_class': '건강 유해성', 'signal_word': 'Danger', 'related_pictograms': ['GHS08']},
        {'code': 'H371', 'text_ko': '장기에 손상을 일으킬 수 있음', 'text_en': 'May cause damage to organs', 'hazard_class': '건강 유해성', 'signal_word': 'Warning', 'related_pictograms': ['GHS08']},
        {'code': 'H372', 'text_ko': '장기간 또는 반복 노출되면 장기에 손상을 일으킴', 'text_en': 'Causes damage to organs through prolonged or repeated exposure', 'hazard_class': '건강 유해성', 'signal_word': 'Danger', 'related_pictograms': ['GHS08']},
        {'code': 'H373', 'text_ko': '장기간 또는 반복 노출되면 장기에 손상을 일으킬 수 있음', 'text_en': 'May cause damage to organs through prolonged or repeated exposure', 'hazard_class': '건강 유해성', 'signal_word': 'Warning', 'related_pictograms': ['GHS08']},

        # Environmental hazards
        {'code': 'H400', 'text_ko': '수생생물에 매우 유독함', 'text_en': 'Very toxic to aquatic life', 'hazard_class': '환경 유해성', 'signal_word': 'Warning', 'related_pictograms': ['GHS09']},
        {'code': 'H410', 'text_ko': '장기적 영향에 의해 수생생물에 매우 유독함', 'text_en': 'Very toxic to aquatic life with long lasting effects', 'hazard_class': '환경 유해성', 'signal_word': 'Warning', 'related_pictograms': ['GHS09']},
        {'code': 'H411', 'text_ko': '장기적 영향에 의해 수생생물에 유독함', 'text_en': 'Toxic to aquatic life with long lasting effects', 'hazard_class': '환경 유해성', 'signal_word': 'None', 'related_pictograms': ['GHS09']},
        {'code': 'H412', 'text_ko': '장기적 영향에 의해 수생생물에 유해함', 'text_en': 'Harmful to aquatic life with long lasting effects', 'hazard_class': '환경 유해성', 'signal_word': 'None', 'related_pictograms': ['GHS09']},
    ]

    for data in statements:
        statement = HazardStatement.query.filter_by(code=data['code']).first()
        if not statement:
            statement = HazardStatement(**data)
            db.session.add(statement)
            print(f"Added hazard statement: {data['code']} - {data['text_ko']}")
        else:
            print(f"Hazard statement already exists: {data['code']}")

    db.session.commit()
    print(f"\nInitialized {len(statements)} hazard statements")


def init_precautionary_statements():
    """Initialize common precautionary statements (P-codes)"""
    statements = [
        # Prevention
        {'code': 'P201', 'text_ko': '사용 전 취급 설명서를 확보하시오', 'text_en': 'Obtain special instructions before use', 'category': 'Prevention'},
        {'code': 'P202', 'text_ko': '모든 안전 조치 문구를 읽고 이해하기 전에는 취급하지 마시오', 'text_en': 'Do not handle until all safety precautions have been read and understood', 'category': 'Prevention'},
        {'code': 'P210', 'text_ko': '열·불꽃·스파크·고온의 표면으로부터 멀리하시오 - 금연', 'text_en': 'Keep away from heat, hot surfaces, sparks, open flames and other ignition sources. No smoking', 'category': 'Prevention'},
        {'code': 'P220', 'text_ko': '의류 및 다른 가연성 물질로부터 멀리하시오', 'text_en': 'Keep away from clothing and other combustible materials', 'category': 'Prevention'},
        {'code': 'P233', 'text_ko': '용기를 단단히 밀폐하시오', 'text_en': 'Keep container tightly closed', 'category': 'Prevention'},
        {'code': 'P240', 'text_ko': '용기와 수용설비를 접지·본딩하시오', 'text_en': 'Ground and bond container and receiving equipment', 'category': 'Prevention'},
        {'code': 'P241', 'text_ko': '폭발 방지용 전기·환기·조명 장비를 사용하시오', 'text_en': 'Use explosion-proof electrical, ventilating, lighting equipment', 'category': 'Prevention'},
        {'code': 'P242', 'text_ko': '불꽃을 일으키지 않는 공구를 사용하시오', 'text_en': 'Use only non-sparking tools', 'category': 'Prevention'},
        {'code': 'P243', 'text_ko': '정전기 방지 조치를 취하시오', 'text_en': 'Take action to prevent static discharges', 'category': 'Prevention'},
        {'code': 'P260', 'text_ko': '분진·흄·가스·미스트·증기·스프레이를 흡입하지 마시오', 'text_en': 'Do not breathe dust/fume/gas/mist/vapours/spray', 'category': 'Prevention'},
        {'code': 'P261', 'text_ko': '분진·흄·가스·미스트·증기·스프레이의 흡입을 피하시오', 'text_en': 'Avoid breathing dust/fume/gas/mist/vapours/spray', 'category': 'Prevention'},
        {'code': 'P264', 'text_ko': '취급 후에는 손을 철저히 씻으시오', 'text_en': 'Wash hands thoroughly after handling', 'category': 'Prevention'},
        {'code': 'P270', 'text_ko': '이 제품을 사용할 때에는 먹거나, 마시거나 흡연하지 마시오', 'text_en': 'Do not eat, drink or smoke when using this product', 'category': 'Prevention'},
        {'code': 'P271', 'text_ko': '옥외 또는 환기가 잘 되는 곳에서만 취급하시오', 'text_en': 'Use only outdoors or in a well-ventilated area', 'category': 'Prevention'},
        {'code': 'P272', 'text_ko': '작업장 밖으로 오염된 의복을 반출하지 마시오', 'text_en': 'Contaminated work clothing should not be allowed out of the workplace', 'category': 'Prevention'},
        {'code': 'P273', 'text_ko': '환경으로 배출하지 마시오', 'text_en': 'Avoid release to the environment', 'category': 'Prevention'},
        {'code': 'P280', 'text_ko': '보호장갑·보호의·보안경·안면보호구를 착용하시오', 'text_en': 'Wear protective gloves/protective clothing/eye protection/face protection', 'category': 'Prevention'},
        {'code': 'P281', 'text_ko': '지정된 개인보호구를 착용하시오', 'text_en': 'Use personal protective equipment as required', 'category': 'Prevention'},

        # Response
        {'code': 'P301', 'text_ko': '삼켰다면', 'text_en': 'IF SWALLOWED', 'category': 'Response'},
        {'code': 'P302', 'text_ko': '피부에 묻으면', 'text_en': 'IF ON SKIN', 'category': 'Response'},
        {'code': 'P303', 'text_ko': '피부(또는 머리카락)에 묻으면', 'text_en': 'IF ON SKIN (or hair)', 'category': 'Response'},
        {'code': 'P304', 'text_ko': '흡입하면', 'text_en': 'IF INHALED', 'category': 'Response'},
        {'code': 'P305', 'text_ko': '눈에 들어가면', 'text_en': 'IF IN EYES', 'category': 'Response'},
        {'code': 'P308', 'text_ko': '노출되거나 노출이 우려되면', 'text_en': 'IF exposed or concerned', 'category': 'Response'},
        {'code': 'P310', 'text_ko': '즉시 의료기관(의사)의 진찰을 받으시오', 'text_en': 'Immediately call a POISON CENTER/doctor', 'category': 'Response'},
        {'code': 'P311', 'text_ko': '의료기관(의사)의 진찰을 받으시오', 'text_en': 'Call a POISON CENTER/doctor', 'category': 'Response'},
        {'code': 'P312', 'text_ko': '불편함을 느끼면 의료기관(의사)의 진찰을 받으시오', 'text_en': 'Call a POISON CENTER/doctor if you feel unwell', 'category': 'Response'},
        {'code': 'P313', 'text_ko': '의학적인 조치·조언을 구하시오', 'text_en': 'Get medical advice/attention', 'category': 'Response'},
        {'code': 'P314', 'text_ko': '불편함을 느끼면 의학적인 조치·조언을 구하시오', 'text_en': 'Get medical advice/attention if you feel unwell', 'category': 'Response'},
        {'code': 'P315', 'text_ko': '즉시 의학적인 조치·조언을 구하시오', 'text_en': 'Get immediate medical advice/attention', 'category': 'Response'},
        {'code': 'P320', 'text_ko': '긴급히 특별한 처치가 필요함', 'text_en': 'Specific treatment is urgent', 'category': 'Response'},
        {'code': 'P321', 'text_ko': '특별한 처치가 필요함', 'text_en': 'Specific treatment', 'category': 'Response'},
        {'code': 'P330', 'text_ko': '입을 씻어내시오', 'text_en': 'Rinse mouth', 'category': 'Response'},
        {'code': 'P331', 'text_ko': '토하게 하지 마시오', 'text_en': 'Do NOT induce vomiting', 'category': 'Response'},
        {'code': 'P332', 'text_ko': '피부 자극이 생기면', 'text_en': 'If skin irritation occurs', 'category': 'Response'},
        {'code': 'P333', 'text_ko': '피부자극성 또는 홍반이 나타나면', 'text_en': 'If skin irritation or rash occurs', 'category': 'Response'},
        {'code': 'P334', 'text_ko': '차가운 물에 담그거나 젖은 붕대로 감으시오', 'text_en': 'Immerse in cool water or wrap in wet bandages', 'category': 'Response'},
        {'code': 'P335', 'text_ko': '피부에 묻은 입자를 털어내시오', 'text_en': 'Brush off loose particles from skin', 'category': 'Response'},
        {'code': 'P336', 'text_ko': '얼어붙은 부위를 미지근한 물로 녹이시오. 그 부위를 문지르지 마시오', 'text_en': 'Thaw frosted parts with lukewarm water. Do not rub affected area', 'category': 'Response'},
        {'code': 'P337', 'text_ko': '눈에 대한 자극이 지속되면', 'text_en': 'If eye irritation persists', 'category': 'Response'},
        {'code': 'P338', 'text_ko': '콘택트렌즈를 제거하고 계속 씻으시오', 'text_en': 'Remove contact lenses, if present and easy to do. Continue rinsing', 'category': 'Response'},
        {'code': 'P340', 'text_ko': '신선한 공기가 있는 곳으로 옮기고 호흡하기 쉬운 자세로 안정시키시오', 'text_en': 'Remove person to fresh air and keep comfortable for breathing', 'category': 'Response'},
        {'code': 'P351', 'text_ko': '몇 분간 물로 조심해서 씻으시오', 'text_en': 'Rinse cautiously with water for several minutes', 'category': 'Response'},
        {'code': 'P352', 'text_ko': '다량의 물로 씻으시오', 'text_en': 'Wash with plenty of water', 'category': 'Response'},
        {'code': 'P353', 'text_ko': '피부를 물로 씻으시오/샤워하시오', 'text_en': 'Rinse skin with water or shower', 'category': 'Response'},
        {'code': 'P360', 'text_ko': '오염된 의복 및 피부를 즉시 물로 씻어내시오. 그 후 의복은 벗으시오', 'text_en': 'Rinse immediately contaminated clothing and skin with plenty of water before removing clothes', 'category': 'Response'},
        {'code': 'P361', 'text_ko': '오염된 모든 의복을 즉시 벗으시오/제거하시오', 'text_en': 'Take off immediately all contaminated clothing', 'category': 'Response'},
        {'code': 'P362', 'text_ko': '오염된 의복을 벗으시오', 'text_en': 'Take off contaminated clothing', 'category': 'Response'},
        {'code': 'P363', 'text_ko': '오염된 의복은 다시 사용 전 세척하시오', 'text_en': 'Wash contaminated clothing before reuse', 'category': 'Response'},
        {'code': 'P370', 'text_ko': '화재 시', 'text_en': 'In case of fire', 'category': 'Response'},
        {'code': 'P371', 'text_ko': '대형 화재 및 대량 누출 시', 'text_en': 'In case of major fire and large quantities', 'category': 'Response'},
        {'code': 'P372', 'text_ko': '밀폐된 공간에서 화재 시 폭발 위험', 'text_en': 'Explosion risk in case of fire', 'category': 'Response'},
        {'code': 'P373', 'text_ko': '화재가 통제 불능 상태로 확대되면 소화하지 마시오', 'text_en': 'DO NOT fight fire when fire reaches explosives', 'category': 'Response'},
        {'code': 'P374', 'text_ko': '적당한 거리를 두고 소화하시오', 'text_en': 'Fight fire with normal precautions from a reasonable distance', 'category': 'Response'},
        {'code': 'P375', 'text_ko': '폭발 위험이 있으므로 거리를 두고 소화하시오', 'text_en': 'Fight fire remotely due to the risk of explosion', 'category': 'Response'},
        {'code': 'P376', 'text_ko': '누출원을 안전하게 차단하시오', 'text_en': 'Stop leak if safe to do so', 'category': 'Response'},
        {'code': 'P377', 'text_ko': '새는 가스로 인한 화재 시: 누출을 안전하게 막을 수 없다면 불을 끄지 마시오', 'text_en': 'Leaking gas fire: Do not extinguish, unless leak can be stopped safely', 'category': 'Response'},
        {'code': 'P378', 'text_ko': '소화 시 [적절한 소화제]를 사용하시오', 'text_en': 'Use [appropriate media] to extinguish', 'category': 'Response'},
        {'code': 'P380', 'text_ko': '주변 지역을 대피시키시오', 'text_en': 'Evacuate area', 'category': 'Response'},
        {'code': 'P381', 'text_ko': '모든 점화원을 제거하시오', 'text_en': 'Eliminate all ignition sources if safe to do so', 'category': 'Response'},
        {'code': 'P390', 'text_ko': '추가 손해를 방지하기 위해 누출물을 흡수하시오', 'text_en': 'Absorb spillage to prevent material damage', 'category': 'Response'},
        {'code': 'P391', 'text_ko': '누출물을 모으시오', 'text_en': 'Collect spillage', 'category': 'Response'},

        # Storage
        {'code': 'P401', 'text_ko': '[해당 법규에 명시된 대로] 보관하시오', 'text_en': 'Store in accordance with local regulations', 'category': 'Storage'},
        {'code': 'P402', 'text_ko': '건조한 장소에 보관하시오', 'text_en': 'Store in a dry place', 'category': 'Storage'},
        {'code': 'P403', 'text_ko': '환기가 잘 되는 곳에 보관하시오', 'text_en': 'Store in a well-ventilated place', 'category': 'Storage'},
        {'code': 'P404', 'text_ko': '밀폐용기에 보관하시오', 'text_en': 'Store in a closed container', 'category': 'Storage'},
        {'code': 'P405', 'text_ko': '잠금장치가 있는 저장장소에 보관하시오', 'text_en': 'Store locked up', 'category': 'Storage'},
        {'code': 'P406', 'text_ko': '부식방지용기에 보관하시오', 'text_en': 'Store in corrosive resistant container', 'category': 'Storage'},
        {'code': 'P407', 'text_ko': '적재물 더미 사이에 공간을 유지하시오', 'text_en': 'Maintain air gap between stacks/pallets', 'category': 'Storage'},
        {'code': 'P410', 'text_ko': '직사광선을 피하시오', 'text_en': 'Protect from sunlight', 'category': 'Storage'},
        {'code': 'P411', 'text_ko': '[구체적 온도]℃ 이하의 온도로 보관하시오', 'text_en': 'Store at temperatures not exceeding [specific temperature]°C', 'category': 'Storage'},
        {'code': 'P412', 'text_ko': '50℃ 이상의 온도에 노출시키지 마시오', 'text_en': 'Do not expose to temperatures exceeding 50°C', 'category': 'Storage'},
        {'code': 'P413', 'text_ko': '[무게] kg 이상은 [구체적 온도]℃ 이하의 온도로 보관하시오', 'text_en': 'Store bulk masses greater than [weight] kg at temperatures not exceeding [specific temperature]°C', 'category': 'Storage'},
        {'code': 'P420', 'text_ko': '다른 물질과 떨어뜨려 보관하시오', 'text_en': 'Store separately', 'category': 'Storage'},
        {'code': 'P422', 'text_ko': '[구체적 물질]에 보관하시오', 'text_en': 'Store contents under [specific material]', 'category': 'Storage'},

        # Disposal
        {'code': 'P501', 'text_ko': '내용물/용기를 [해당 법규에 명시된 내용에 따라] 폐기하시오', 'text_en': 'Dispose of contents/container to approved disposal site', 'category': 'Disposal'},
        {'code': 'P502', 'text_ko': '재활용 또는 회수 정보는 제조자/공급자에게 문의하시오', 'text_en': 'Refer to manufacturer/supplier for information on recovery/recycling', 'category': 'Disposal'},
    ]

    for data in statements:
        statement = PrecautionaryStatement.query.filter_by(code=data['code']).first()
        if not statement:
            statement = PrecautionaryStatement(**data)
            db.session.add(statement)
            print(f"Added precautionary statement: {data['code']} - {data['text_ko']}")
        else:
            print(f"Precautionary statement already exists: {data['code']}")

    db.session.commit()
    print(f"\nInitialized {len(statements)} precautionary statements")


def main():
    """Main initialization function"""
    app = create_app()

    with app.app_context():
        print("=" * 80)
        print("SafeWork Warning Sign Reference Data Initialization")
        print("=" * 80)
        print()

        # Create tables
        print("Creating database tables...")
        db.create_all()
        print("✓ Tables created")
        print()

        # Initialize data
        init_ghs_pictograms()
        print()
        init_hazard_statements()
        print()
        init_precautionary_statements()
        print()

        print("=" * 80)
        print("✓ Initialization complete!")
        print("=" * 80)


if __name__ == '__main__':
    main()

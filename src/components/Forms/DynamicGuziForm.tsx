import React, { useMemo, useState } from 'react';
import { GuziUnionSchema, type GuziItem, type GuziType } from '../../types/models/guzi.schema';

type FormMode = 'create' | 'draft' | 'edit';

interface DynamicGuziFormProps {
  initialData?: Partial<GuziItem>;
  mode: FormMode;
  sourceUrl?: string;
  onSubmit: (item: GuziItem) => void;
  onCancel?: () => void;
}

type FormValues = Record<string, string>;

const guziTypes: Array<{ value: GuziType; label: string }> = [
  { value: 'badge', label: '吧唧' },
  { value: 'paper_card', label: '纸片' },
  { value: 'acrylic', label: '亚克力' },
  { value: 'fabric', label: '布艺' },
  { value: 'figure', label: '手办' },
  { value: 'practical', label: '实用' },
  { value: 'special', label: '特殊' },
];

const shapeOptions = [
  { value: 'round', label: '圆形' },
  { value: 'square', label: '方形' },
  { value: 'custom', label: '异形' },
];

const specialTypeOptions = [
  { value: 'blind_box', label: '盲盒' },
  { value: 'limited_collab', label: '限定联名' },
  { value: 'other', label: '其他' },
];

const commonFields = [
  { name: 'name', label: '名称', placeholder: '例如：水蓝徽章' },
  { name: 'ip', label: 'IP', placeholder: '例如：芙宁娜' },
  { name: 'character', label: '人物', placeholder: '例如：角色名' },
  { name: 'series', label: '系列', placeholder: '例如：生日系列' },
  { name: 'imageUrl', label: '图片 URL', placeholder: 'https://example.com/item.jpg' },
  { name: 'officialPrice', label: '官方价', placeholder: '0' },
  { name: 'purchasePrice', label: '购入价', placeholder: '0' },
  { name: 'marketPrice', label: '市价', placeholder: '0' },
];

const createInitialValues = (initialData?: Partial<GuziItem>, sourceUrl?: string): FormValues => {
  const values: FormValues = {
    id: initialData?.id ?? `guzi_${Date.now()}`,
    type: initialData?.type ?? 'badge',
    name: initialData?.name ?? '',
    ip: initialData?.ip ?? '',
    character: initialData?.character ?? '',
    series: initialData?.series ?? '',
    imageUrl: initialData?.imageUrl ?? sourceUrl ?? '',
    officialPrice: initialData?.officialPrice?.toString() ?? '',
    purchasePrice: initialData?.purchasePrice?.toString() ?? '',
    marketPrice: initialData?.marketPrice?.toString() ?? '',
    diameter: '',
    shape: 'round',
    length: '',
    width: '',
    paperType: '',
    height: '',
    hasBase: 'true',
    material: '',
    scale: '',
    manufacturer: '',
    compatibleModel: '',
    specialType: 'other',
    description: '',
    isSecret: 'false',
  };

  Object.entries(initialData ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      values[key] = String(value);
    }
  });

  return values;
};

const optionalNumber = (value: string): number | undefined => {
  if (value.trim() === '') {
    return undefined;
  }

  return Number(value);
};

const requiredNumber = (value: string): number => Number(value);

const buildItemInput = (values: FormValues): unknown => {
  const base = {
    id: values.id,
    name: values.name,
    ip: values.ip,
    character: values.character,
    series: values.series,
    imageUrl: values.imageUrl,
    officialPrice: optionalNumber(values.officialPrice),
    purchasePrice: optionalNumber(values.purchasePrice),
    marketPrice: optionalNumber(values.marketPrice),
  };

  if (values.type === 'badge') {
    return {
      ...base,
      type: 'badge',
      diameter: requiredNumber(values.diameter),
      shape: values.shape,
    };
  }

  if (values.type === 'paper_card') {
    return {
      ...base,
      type: 'paper_card',
      length: requiredNumber(values.length),
      width: requiredNumber(values.width),
      paperType: values.paperType.trim() || undefined,
    };
  }

  if (values.type === 'acrylic') {
    return {
      ...base,
      type: 'acrylic',
      height: requiredNumber(values.height),
      hasBase: values.hasBase === 'true',
      width: optionalNumber(values.width),
    };
  }

  if (values.type === 'fabric') {
    return {
      ...base,
      type: 'fabric',
      length: requiredNumber(values.length),
      width: requiredNumber(values.width),
      material: values.material,
      height: optionalNumber(values.height),
    };
  }

  if (values.type === 'figure') {
    return {
      ...base,
      type: 'figure',
      scale: values.scale,
      height: requiredNumber(values.height),
      manufacturer: values.manufacturer,
    };
  }

  if (values.type === 'practical') {
    return {
      ...base,
      type: 'practical',
      compatibleModel: values.compatibleModel,
      length: optionalNumber(values.length),
      width: optionalNumber(values.width),
    };
  }

  return {
    ...base,
    type: 'special',
    specialType: values.specialType,
    description: values.description,
    isSecret: values.isSecret === 'true',
  };
};

export const DynamicGuziForm: React.FC<DynamicGuziFormProps> = ({
  initialData,
  mode,
  sourceUrl,
  onSubmit,
  onCancel,
}) => {
  const [values, setValues] = useState<FormValues>(() => createInitialValues(initialData, sourceUrl));
  const [error, setError] = useState<string | null>(null);
  const selectedType = values.type as GuziType;

  const title = useMemo(() => {
    if (mode === 'edit') {
      return '编辑谷子';
    }

    if (mode === 'draft') {
      return '确认草稿';
    }

    return '手动录入';
  }, [mode]);

  const updateValue = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = GuziUnionSchema.safeParse(buildItemInput(values));

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '请检查表单字段');
      return;
    }

    setError(null);
    onSubmit(parsed.data);
  };

  return (
    <form className="guzi-form" onSubmit={handleSubmit}>
      <div className="section-heading">
        <span className="eyebrow">{title}</span>
        <h2>补齐收藏信息</h2>
      </div>

      <label className="field-label">
        品类
        <select value={selectedType} onChange={(event) => updateValue('type', event.target.value)}>
          {guziTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>

      <div className="form-grid">
        {commonFields.map((field) => (
          <label key={field.name} className="field-label">
            {field.label}
            <input
              type={field.name.includes('Price') ? 'number' : 'text'}
              min={field.name.includes('Price') ? 0 : undefined}
              step={field.name.includes('Price') ? '0.01' : undefined}
              value={values[field.name] ?? ''}
              onChange={(event) => updateValue(field.name, event.target.value)}
              placeholder={field.placeholder}
            />
          </label>
        ))}
      </div>

      {selectedType === 'badge' ? (
        <div className="form-grid">
          <label className="field-label">
            直径 mm
            <input type="number" min={1} value={values.diameter} onChange={(event) => updateValue('diameter', event.target.value)} />
          </label>
          <label className="field-label">
            形状
            <select value={values.shape} onChange={(event) => updateValue('shape', event.target.value)}>
              {shapeOptions.map((shape) => (
                <option key={shape.value} value={shape.value}>
                  {shape.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {selectedType === 'paper_card' ? (
        <div className="form-grid">
          <label className="field-label">
            长 mm
            <input type="number" min={1} value={values.length} onChange={(event) => updateValue('length', event.target.value)} />
          </label>
          <label className="field-label">
            宽 mm
            <input type="number" min={1} value={values.width} onChange={(event) => updateValue('width', event.target.value)} />
          </label>
          <label className="field-label">
            材质
            <input value={values.paperType} onChange={(event) => updateValue('paperType', event.target.value)} placeholder="相纸 / 卡纸 / 贴纸" />
          </label>
        </div>
      ) : null}

      {selectedType === 'acrylic' ? (
        <div className="form-grid">
          <label className="field-label">
            高 mm
            <input type="number" min={1} value={values.height} onChange={(event) => updateValue('height', event.target.value)} />
          </label>
          <label className="field-label">
            宽 mm
            <input type="number" min={1} value={values.width} onChange={(event) => updateValue('width', event.target.value)} />
          </label>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={values.hasBase === 'true'}
              onChange={(event) => updateValue('hasBase', String(event.target.checked))}
            />
            带底座
          </label>
        </div>
      ) : null}

      {selectedType === 'fabric' ? (
        <div className="form-grid">
          <label className="field-label">
            长 mm
            <input type="number" min={1} value={values.length} onChange={(event) => updateValue('length', event.target.value)} />
          </label>
          <label className="field-label">
            宽 mm
            <input type="number" min={1} value={values.width} onChange={(event) => updateValue('width', event.target.value)} />
          </label>
          <label className="field-label">
            材质
            <input value={values.material} onChange={(event) => updateValue('material', event.target.value)} />
          </label>
        </div>
      ) : null}

      {selectedType === 'figure' ? (
        <div className="form-grid">
          <label className="field-label">
            比例
            <input value={values.scale} onChange={(event) => updateValue('scale', event.target.value)} placeholder="1/7" />
          </label>
          <label className="field-label">
            高 mm
            <input type="number" min={1} value={values.height} onChange={(event) => updateValue('height', event.target.value)} />
          </label>
          <label className="field-label">
            厂商
            <input value={values.manufacturer} onChange={(event) => updateValue('manufacturer', event.target.value)} />
          </label>
        </div>
      ) : null}

      {selectedType === 'practical' ? (
        <div className="form-grid">
          <label className="field-label">
            适配型号
            <input value={values.compatibleModel} onChange={(event) => updateValue('compatibleModel', event.target.value)} />
          </label>
          <label className="field-label">
            长 mm
            <input type="number" min={1} value={values.length} onChange={(event) => updateValue('length', event.target.value)} />
          </label>
          <label className="field-label">
            宽 mm
            <input type="number" min={1} value={values.width} onChange={(event) => updateValue('width', event.target.value)} />
          </label>
        </div>
      ) : null}

      {selectedType === 'special' ? (
        <div className="form-grid">
          <label className="field-label">
            特殊类型
            <select value={values.specialType} onChange={(event) => updateValue('specialType', event.target.value)}>
              {specialTypeOptions.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            说明
            <input value={values.description} onChange={(event) => updateValue('description', event.target.value)} />
          </label>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={values.isSecret === 'true'}
              onChange={(event) => updateValue('isSecret', String(event.target.checked))}
            />
            隐藏款
          </label>
        </div>
      ) : null}

      {error ? <p className="inline-alert" role="alert">{error}</p> : null}

      <div className="sticky-actions">
        <button type="submit" className="primary-button">
          {mode === 'edit' ? '保存修改' : '生成草稿'}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel}>
            取消
          </button>
        ) : null}
      </div>
    </form>
  );
};

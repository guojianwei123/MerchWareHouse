import React, { useEffect, useMemo, useState } from 'react';
import { GuziUnionSchema, type GuziItem } from '../../types/models/guzi.schema';
import type { ZodIssue } from 'zod';
import { fixedGuziCategories, getGuziCategoryLabel } from '../../config/categories';
import { useCategoryStore } from '../../store/categoryStore';
import { useInventoryStore } from '../../store/inventoryStore';

type FormMode = 'create' | 'draft' | 'edit';

interface DynamicGuziFormProps {
  initialData?: Partial<GuziItem>;
  mode: FormMode;
  sourceUrl?: string;
  onSubmit: (item: GuziItem) => void;
  onCancel?: () => void;
  values?: GuziFormValues;
  onValuesChange?: (values: GuziFormValues) => void;
}

export type GuziFormValues = Record<string, string>;

const customTypeValue = '__custom__';

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

const fieldLabels: Record<string, string> = {
  type: '品类',
  name: '名称',
  ip: 'IP',
  character: '人物',
  series: '系列',
  imageUrl: '图片 URL',
  officialPrice: '官方价',
  purchasePrice: '购入价',
  marketPrice: '市价',
  diameter: '直径',
  shape: '形状',
  length: '长',
  width: '宽',
  height: '高',
  material: '材质',
  scale: '比例',
  manufacturer: '厂商',
  compatibleModel: '适配型号',
  description: '说明',
};

const isPresetGuziType = (type: string, options: Array<{ value: string }>): boolean => {
  return options.some((option) => option.value === type);
};

const formatValidationIssue = (issue: ZodIssue | undefined): string => {
  if (!issue) {
    return '请检查表单字段';
  }

  const fieldName = String(issue.path[0] ?? '');
  const label = fieldLabels[fieldName];

  if (label && issue.code === 'too_small') {
    return `请填写${label}`;
  }

  if (fieldName === 'imageUrl') {
    return '请填写有效的图片 URL';
  }

  return label ? `${label}：${issue.message}` : issue.message;
};

export const createGuziFormValues = (initialData?: Partial<GuziItem>, sourceUrl?: string): GuziFormValues => {
  const values: GuziFormValues = {
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

const optionalText = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const buildCustomDetailInput = (values: GuziFormValues): Record<string, unknown> => ({
  diameter: optionalNumber(values.diameter),
  shape: optionalText(values.shape),
  length: optionalNumber(values.length),
  width: optionalNumber(values.width),
  height: optionalNumber(values.height),
  material: optionalText(values.material),
  scale: optionalText(values.scale),
  manufacturer: optionalText(values.manufacturer),
  description: optionalText(values.description),
  paperType: optionalText(values.paperType),
  compatibleModel: optionalText(values.compatibleModel),
});

const buildItemInput = (values: GuziFormValues): unknown => {
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
      diameter: optionalNumber(values.diameter),
      shape: optionalText(values.shape),
    };
  }

  if (values.type === 'paper_card') {
    return {
      ...base,
      type: 'paper_card',
      length: optionalNumber(values.length),
      width: optionalNumber(values.width),
      paperType: optionalText(values.paperType),
    };
  }

  if (values.type === 'acrylic') {
    return {
      ...base,
      type: 'acrylic',
      height: optionalNumber(values.height),
      hasBase: values.hasBase === 'true',
      width: optionalNumber(values.width),
    };
  }

  if (values.type === 'fabric') {
    return {
      ...base,
      type: 'fabric',
      length: optionalNumber(values.length),
      width: optionalNumber(values.width),
      material: optionalText(values.material),
      height: optionalNumber(values.height),
    };
  }

  if (values.type === 'figure') {
    return {
      ...base,
      type: 'figure',
      scale: optionalText(values.scale),
      height: optionalNumber(values.height),
      manufacturer: optionalText(values.manufacturer),
    };
  }

  if (values.type === 'practical') {
    return {
      ...base,
      type: 'practical',
      compatibleModel: optionalText(values.compatibleModel),
      length: optionalNumber(values.length),
      width: optionalNumber(values.width),
    };
  }

  return {
    ...base,
    ...(values.type === 'special'
      ? {
          type: 'special',
          specialType: optionalText(values.specialType),
          description: optionalText(values.description),
          isSecret: values.isSecret === 'true',
        }
      : {
          type: values.type,
          ...buildCustomDetailInput(values),
        }),
  };
};

export const DynamicGuziForm: React.FC<DynamicGuziFormProps> = ({
  initialData,
  mode,
  sourceUrl,
  onSubmit,
  onCancel,
  values: controlledValues,
  onValuesChange,
}) => {
  const [internalValues, setInternalValues] = useState<GuziFormValues>(() => createGuziFormValues(initialData, sourceUrl));
  const [error, setError] = useState<string | null>(null);
  const customCategories = useCategoryStore((state) => state.categories);
  const addLocalCategoryName = useCategoryStore((state) => state.addLocalCategoryName);
  const inventoryItems = useInventoryStore((state) => state.items);
  const values = controlledValues ?? internalValues;
  const selectedType = values.type;
  const typeOptions = useMemo(() => {
    const seen = new Set<string>();

    return [
      ...fixedGuziCategories.map((category) => ({ value: category.value, label: category.label })),
      ...customCategories.map((category) => ({ value: category.name, label: category.name })),
      ...inventoryItems.map((item) => ({ value: item.type, label: getGuziCategoryLabel(item.type) })),
      ...(selectedType ? [{ value: selectedType, label: getGuziCategoryLabel(selectedType) }] : []),
    ].filter((option) => {
      if (seen.has(option.value)) {
        return false;
      }

      seen.add(option.value);
      return true;
    });
  }, [customCategories, inventoryItems, selectedType]);
  const typeSelectValue = isPresetGuziType(selectedType, typeOptions) ? selectedType : customTypeValue;
  const isCustomType = typeSelectValue === customTypeValue;

  useEffect(() => {
    if (!controlledValues) {
      setInternalValues(createGuziFormValues(initialData, sourceUrl));
    }
  }, [controlledValues, initialData?.id, sourceUrl]);

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
    const nextValues = { ...values, [name]: value };

    if (controlledValues) {
      onValuesChange?.(nextValues);
      return;
    }

    setInternalValues(nextValues);
  };

  const updateType = (value: string) => {
    updateValue('type', value === customTypeValue ? '' : value);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = GuziUnionSchema.safeParse(buildItemInput(values));

    if (!parsed.success) {
      setError(formatValidationIssue(parsed.error.issues[0]));
      return;
    }

    setError(null);
    addLocalCategoryName(parsed.data.type);
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
        <select value={typeSelectValue} onChange={(event) => updateType(event.target.value)}>
          {typeOptions.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
          <option value={customTypeValue}>自定义</option>
        </select>
      </label>

      {isCustomType ? (
        <label className="field-label">
          自定义品类
          <input value={values.type} onChange={(event) => updateValue('type', event.target.value)} placeholder="例如：色纸 / 挂件 / 票根" />
        </label>
      ) : null}

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

import axios from 'axios';

export interface AddressData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

export interface AddressFormData {
  rua: string;
  complemento: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  pais: string;
}

export const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

export const fetchAddressByCep = async (cep: string): Promise<AddressData | null> => {
  try {
    // Remove non-numeric characters
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
      throw new Error('CEP deve ter 8 dígitos');
    }

    const response = await axios.get(`https://viacep.com.br/ws/${cleanCep}/json/`);

    if (response.data.erro) {
      throw new Error('CEP não encontrado');
    }

    return response.data;
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
};

export const formatAddressForStorage = (addressData: AddressFormData): string => {
  const { rua, complemento, bairro, cep, cidade, estado, pais } = addressData;

  let address = rua;

  if (complemento) {
    address += `, ${complemento}`;
  }

  address += `, ${bairro}, ${cidade} - ${estado}, ${cep}`;

  if (pais !== 'Brasil') {
    address += `, ${pais}`;
  }

  return address;
};

export const parseAddressFromStorage = (addressString: string): AddressFormData => {
  // Default values
  const defaultAddress: AddressFormData = {
    rua: '',
    complemento: '',
    bairro: '',
    cep: '',
    cidade: '',
    estado: '',
    pais: 'Brasil',
  };

  if (!addressString) {
    return defaultAddress;
  }

  // Try to parse the address string
  // Expected format: "Rua, Complemento, Bairro, Cidade - Estado, CEP, País"
  const parts = addressString.split(',').map(part => part.trim());

  if (parts.length >= 4) {
    const rua = parts[0];
    const complemento = parts[1] || '';
    const bairro = parts[2] || '';

    // Parse city and state
    const cityStatePart = parts[3] || '';
    const cityStateMatch = cityStatePart.match(/^(.+?)\s*-\s*(.+)$/);
    const cidade = cityStateMatch ? cityStateMatch[1].trim() : cityStatePart;
    const estado = cityStateMatch ? cityStateMatch[2].trim() : '';

    // Parse CEP
    const cepPart = parts[4] || '';
    const cepMatch = cepPart.match(/(\d{5}-\d{3}|\d{8})/);
    const cep = cepMatch ? cepMatch[1] : '';

    // Parse country (if present)
    const pais = parts[5] ? parts[5].trim() : 'Brasil';

    return {
      rua,
      complemento,
      bairro,
      cep,
      cidade,
      estado,
      pais,
    };
  }

  return defaultAddress;
};

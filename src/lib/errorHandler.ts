/**
 * Maps internal error messages to user-friendly messages
 * Prevents information disclosure while maintaining good UX
 */
export function mapErrorToUserMessage(error: unknown): string {
  // Log full error for debugging (only in development)
  if (import.meta.env.DEV) {
    console.error('Detailed error:', error);
  }

  const errorMessage = (error as { message?: string })?.message?.toLowerCase() || '';

  // Authentication errors - use same message for username enumeration prevention
  if (errorMessage.includes('invalid login credentials') ||
      errorMessage.includes('user not found') ||
      errorMessage.includes('invalid password')) {
    return 'E-mail ou senha incorretos';
  }

  if (errorMessage.includes('email not confirmed')) {
    return 'Por favor, confirme seu e-mail';
  }

  if (errorMessage.includes('user already registered') ||
      errorMessage.includes('already registered')) {
    return 'Este e-mail já está cadastrado';
  }

  if (errorMessage.includes('invalid email')) {
    return 'Formato de e-mail inválido';
  }

  if (errorMessage.includes('password') && errorMessage.includes('weak')) {
    return 'A senha não atende aos requisitos mínimos de segurança';
  }

  // Database/RLS errors
  if (errorMessage.includes('row-level security') ||
      errorMessage.includes('permission denied')) {
    return 'Você não tem permissão para enviar mensagens para este usuário';
  }

  if (errorMessage.includes('violates') ||
      errorMessage.includes('constraint') ||
      errorMessage.includes('invalid input')) {
    return 'Dados inválidos. Verifique as informações';
  }

  if (errorMessage.includes('duplicate')) {
    return 'Este registro já existe no sistema';
  }

  // Network/connection errors
  if (errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection')) {
    return 'Erro de conexão. Verifique sua internet';
  }

  // Rate limiting
  if (errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests')) {
    return 'Muitas tentativas. Aguarde alguns minutos';
  }

  // Storage/upload errors
  if (errorMessage.includes('storage') ||
      errorMessage.includes('upload') ||
      errorMessage.includes('bucket')) {
    return 'Erro no upload do arquivo. Verifique o tamanho e formato';
  }

  if (errorMessage.includes('file too large') ||
      errorMessage.includes('size limit')) {
    return 'Arquivo muito grande. Máximo permitido: 5MB';
  }

  if (errorMessage.includes('invalid file type') ||
      errorMessage.includes('unsupported format')) {
    return 'Formato de arquivo não suportado';
  }

  // Profile update errors
  if (errorMessage.includes('profile') ||
      errorMessage.includes('update') ||
      errorMessage.includes('save')) {
    return 'Erro ao salvar perfil. Verifique os dados e tente novamente';
  }

  // Generic fallback - never expose technical details
  return 'Ocorreu um erro. Tente novamente mais tarde';
}
use crate::error::LauncherError;

#[cfg(target_os = "windows")]
pub fn protect_for_current_user(input: &[u8]) -> Result<Vec<u8>, LauncherError> {
    use std::ptr::{null, null_mut};
    use windows_sys::Win32::Foundation::LocalFree;
    use windows_sys::Win32::Security::Cryptography::{
        CryptProtectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    };

    let input_blob = CRYPT_INTEGER_BLOB {
        cbData: input.len() as u32,
        pbData: input.as_ptr() as *mut u8,
    };
    let mut output_blob = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: null_mut(),
    };
    let success = unsafe {
        CryptProtectData(
            &input_blob,
            null(),
            null(),
            null(),
            null(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output_blob,
        )
    };
    if success == 0 {
        return Err(LauncherError::Internal(
            "Windows could not encrypt the local secret.".into(),
        ));
    }
    let protected = unsafe {
        std::slice::from_raw_parts(output_blob.pbData, output_blob.cbData as usize).to_vec()
    };
    unsafe { LocalFree(output_blob.pbData.cast()) };
    Ok(protected)
}

#[cfg(target_os = "windows")]
pub fn unprotect_for_current_user(input: &[u8]) -> Result<Vec<u8>, LauncherError> {
    use std::ptr::{null, null_mut};
    use windows_sys::Win32::Foundation::LocalFree;
    use windows_sys::Win32::Security::Cryptography::{
        CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    };

    let input_blob = CRYPT_INTEGER_BLOB {
        cbData: input.len() as u32,
        pbData: input.as_ptr() as *mut u8,
    };
    let mut output_blob = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: null_mut(),
    };
    let success = unsafe {
        CryptUnprotectData(
            &input_blob,
            null_mut(),
            null(),
            null(),
            null(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output_blob,
        )
    };
    if success == 0 {
        return Err(LauncherError::Auth(
            "The saved secret could not be decrypted for this Windows user.".into(),
        ));
    }
    let plain = unsafe {
        std::slice::from_raw_parts(output_blob.pbData, output_blob.cbData as usize).to_vec()
    };
    unsafe { LocalFree(output_blob.pbData.cast()) };
    Ok(plain)
}

#[cfg(not(target_os = "windows"))]
pub fn protect_for_current_user(_input: &[u8]) -> Result<Vec<u8>, LauncherError> {
    Err(LauncherError::NotImplemented(
        "Secure token storage is currently implemented for Windows only.".into(),
    ))
}

#[cfg(not(target_os = "windows"))]
pub fn unprotect_for_current_user(_input: &[u8]) -> Result<Vec<u8>, LauncherError> {
    Err(LauncherError::NotImplemented(
        "Secure token storage is currently implemented for Windows only.".into(),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(target_os = "windows")]
    #[test]
    fn encrypted_values_round_trip_for_the_current_user() {
        let plain = b"void-session-test";
        let encrypted = protect_for_current_user(plain).unwrap();
        assert_ne!(encrypted, plain);
        assert_eq!(unprotect_for_current_user(&encrypted).unwrap(), plain);
    }
}
